/*
 * insert_citation-panel-bibliography.ts
 *
 * Copyright (C) 2020 by RStudio, PBC
 *
 * Unless you have received this program directly from RStudio pursuant
 * to the terms of a commercial license agreement with RStudio, then
 * this program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */

import React from "react";

import { Node as ProsemirrorNode } from 'prosemirror-model';

import { FixedSizeList } from "react-window";
import debounce from "lodash.debounce";

import { EditorUI } from "../../../api/ui";
import { TextInput } from "../../../api/widgets/text";
import { NavigationTreeNode } from "../../../api/widgets/navigation-tree";

import { BibliographySource, BibliographyManager, BibliographyCollection } from "../../../api/bibliography/bibliography";
import { kZoteroProviderKey } from "../../../api/bibliography/bibliography-provider_zotero";
import { kLocalBiliographyProviderKey } from "../../../api/bibliography/bibliography-provider_local";

import { CitationSourcePanelProps, CitationSourcePanel } from "../insert_citation-panel";
import { CitationSourcePanelListItem } from "./insert_citation-source-panel-list-item";

import './insert_citation-source-panel-bibliography.css';

const kAllLocalSourcesRootNodeType = 'All Local Sources';

export function bibliographySourcePanel(doc: ProsemirrorNode, ui: EditorUI, bibliographyManager: BibliographyManager): CitationSourcePanel {
  const providers = bibliographyManager.localProviders();
  const localProviderNodes = providers.map(provider => {
    const node: any = {};
    node.key = provider.key;
    node.name = ui.context.translateText(provider.name);
    node.type = provider.key;
    node.image = libraryImageForProvider(provider.key, ui);
    node.children = toTree(provider.key, provider.collections(doc, ui), folderImageForProvider(provider.key, ui));
    return node;
  });

  return {
    key: '17373086-77FE-410F-A319-33E314482125',
    panel: BibligraphySourcePanel,
    treeNode: {
      key: 'My Sources',
      name: ui.context.translateText('My Sources'),
      image: ui.images.citations?.local_sources,
      type: kAllLocalSourcesRootNodeType,
      children: localProviderNodes,
      expanded: true
    }
  };
}

export const BibligraphySourcePanel: React.FC<CitationSourcePanelProps> = props => {

  const bibMgr = props.bibliographyManager;
  const [itemData, setItemData] = React.useState<BibliographySource[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
  const [searchTerm, setSearchTerm] = React.useState<string>();
  const [focused, setFocused] = React.useState<boolean>(false);
  const fixedList = React.useRef<FixedSizeList>(null);
  const listContainer = React.useRef<HTMLDivElement>(null);

  React.useEffect(debounce(() => {
    async function loadData() {
      if (props.selectedNode) {

        // Ignore other nodes
        if (props.selectedNode.type !== kLocalBiliographyProviderKey &&
          props.selectedNode.type !== kZoteroProviderKey &&
          props.selectedNode.type !== kAllLocalSourcesRootNodeType) {
          return;
        }

        const selectedNode = props.selectedNode;

        // The node could be the root node, no provider
        const providerKey = selectedNode.type === kAllLocalSourcesRootNodeType ? undefined : selectedNode.type;

        // The node could be a provider root or a collection
        const collectionKey = (
          selectedNode.type !== kAllLocalSourcesRootNodeType &&
          selectedNode.key !== kZoteroProviderKey &&
          selectedNode.key !== kLocalBiliographyProviderKey) ? selectedNode.key : undefined;

        setItemData(bibMgr.search(searchTerm, providerKey, collectionKey));
        setSelectedIndex(0);
      }
    }
    loadData();
    // load the right panel
  }, 50), [props.selectedNode, searchTerm]);

  // If the nodes change, clear the search box value
  React.useLayoutEffect(() => {
    if (searchBoxRef.current) {
      searchBoxRef.current.value = '';
      setSearchTerm('');
    }
  }, [props.selectedNode]);

  // Whenever selection changed, ensure that we are scrolled to that item
  React.useLayoutEffect(() => {
    fixedList.current?.scrollToItem(selectedIndex);
  }, [selectedIndex]);

  // Search the user search terms
  const searchChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    setSearchTerm(search);
  };

  // Perform first load tasks
  const searchBoxRef = React.useRef<HTMLInputElement>(null);
  const [listHeight, setListHeight] = React.useState<number>(props.height);
  React.useEffect(() => {

    // Size the list Box
    const searchBoxHeight = searchBoxRef.current?.clientHeight;
    if (searchBoxHeight) {
      setListHeight(props.height - searchBoxHeight);
    }

    // Focus the search box
    if (searchBoxRef.current) {
      searchBoxRef.current.focus();
    }
  }, []);


  // Item height and consequently page height
  const itemHeight = 64;
  const itemsPerPage = Math.floor(props.height / itemHeight);

  // Upddate selected item index (this will manage bounds)
  const incrementIndex = (event: React.KeyboardEvent, index: number) => {
    event.stopPropagation();
    event.preventDefault();
    const maxIndex = itemData.length - 1;
    setSelectedIndex(Math.min(Math.max(0, index), maxIndex));
  };

  // Toggle the currently selected item as added or removed
  const toggleSelectedSource = (event: React.KeyboardEvent) => {
    event.stopPropagation();
    event.preventDefault();

    const source = itemData[selectedIndex];
    if (source) {
      if (props.sourcesToAdd.includes(source)) {
        props.removeSource(source);
      } else {
        props.addSource(source);
      }
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        incrementIndex(event, selectedIndex - 1);
        break;

      case 'ArrowDown':
        incrementIndex(event, selectedIndex + 1);
        break;

      case 'PageDown':
        incrementIndex(event, selectedIndex + itemsPerPage);
        break;

      case 'PageUp':
        incrementIndex(event, selectedIndex - itemsPerPage);
        break;

      case 'Enter':
        toggleSelectedSource(event);
        props.confirm();
        break;
      case ' ':
        toggleSelectedSource(event);
        break;
    }
  };

  // If the user arrows down in the search text box, advance to the list of items
  const handleTextKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        listContainer.current?.focus();
        break;
    }
  };

  // Focus / Blur are used to track whether to show selection highlighting
  const onFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    setFocused(true);
  };

  const onBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    setFocused(false);
  };

  return (
    <div style={props.style} className='pm-insert-citation-panel'>
      <div className='pm-insert-citation-panel-textbox-container'>
        <TextInput
          width='100%'
          iconAdornment={props.ui.images.search}
          tabIndex={0}
          className='pm-insert-citation-panel-textbox pm-block-border-color'
          placeholder={props.ui.context.translateText('Search for citation')}
          onKeyDown={handleTextKeyDown}
          onChange={searchChanged}
          ref={searchBoxRef}
        />

      </div>
      {itemData.length === 0 ?
        (<div className='pm-insert-citation-panel-noresults' style={{ height: listHeight + 'px' }}>
          <div className='pm-insert-citation-panel-noresults-text'>{props.ui.context.translateText('No matching results.')}</div>
        </div>) :
        (
          <div tabIndex={0} onKeyDown={handleListKeyDown} onFocus={onFocus} onBlur={onBlur} ref={listContainer}>
            <FixedSizeList
              height={listHeight}
              width='100%'
              itemCount={itemData.length}
              itemSize={itemHeight}
              itemData={{
                selectedIndex,
                allSources: itemData,
                sourcesToAdd: props.sourcesToAdd,
                addSource: props.addSource,
                removeSource: props.removeSource,
                ui: props.ui,
                showSeparator: true,
                showSelection: focused,
                preventFocus: true
              }}
              ref={fixedList}
            >
              {CitationSourcePanelListItem}
            </FixedSizeList>
          </div>
        )}
    </div>);
};


function libraryImageForProvider(providerKey: string, ui: EditorUI) {
  switch (providerKey) {
    case kZoteroProviderKey:
      return ui.images.citations?.zotero_library;
    case kLocalBiliographyProviderKey:
      return ui.images.citations?.bibligraphy;
  }
}

function folderImageForProvider(providerKey: string, ui: EditorUI) {
  switch (providerKey) {
    case kZoteroProviderKey:
      return ui.images.citations?.zotero_folder;
    case kLocalBiliographyProviderKey:
      return ui.images.citations?.bibligraphy_folder;
  }
}

// Takes a flat data structure of containers and turns it into a hierarchical
// tree structure for display as TreeNodes.
function toTree(type: string, containers: BibliographyCollection[], folderImage?: string): NavigationTreeNode[] {

  const treeMap: { [id: string]: NavigationTreeNode } = {};
  const rootNodes: NavigationTreeNode[] = [];

  // Sort the folder in alphabetical order at each level of the tree
  containers.sort((a, b) => a.name.localeCompare(b.name)).forEach(container => {

    // First see if we have an existing node for this item
    // A node could already be there if we had to insert a 'placeholder' 
    // node to contain the node's children before we encountered the node.
    const currentNode = treeMap[container.key] || { key: container.key, name: container.name, image: folderImage, children: [], type };

    // Always set its name to be sure we fill this in when we encounter it
    currentNode.name = container.name;

    if (container.parentKey) {
      let parentNode = treeMap[container.parentKey];
      if (!parentNode) {
        // This is a placeholder node - we haven't yet encountered this child's parent
        // so we insert this to hold the child. Once we encounter the true parent node, 
        // we will fix up the values in this placeholder node.
        parentNode = { key: container.parentKey, name: '', image: folderImage, children: [], type };
        treeMap[container.parentKey] = parentNode;
      }
      parentNode.children?.push(currentNode);
    } else {
      rootNodes.push(currentNode);
    }
    treeMap[container.key] = currentNode;
  });
  return rootNodes;
}

