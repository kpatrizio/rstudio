/*
 * RStudioCellTableStyle.java
 *
 * Copyright (C) 2009-11 by RStudio, Inc.
 *
 * This program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */
package org.rstudio.core.client.theme;

import com.google.gwt.user.cellview.client.CellTable;

public interface RStudioCellTableStyle extends CellTable.Style
{
   String RSTUDIO_DEFAULT_CSS = "org/rstudio/core/client/theme/RStudioCellTableStyle.css";
}
