/* tslint:disable:max-line-length */

import { NestedOption } from 'devextreme-angular/core';
import {
    Component,
} from '@angular/core';

import { dxContextMenuItem } from '@ISalikhzyanov/devextreme/ui/context_menu';
import { Command, CustomCommand } from '@ISalikhzyanov/devextreme/ui/diagram';
import { dxFileManagerContextMenuItem, FileManagerPredefinedContextMenuItem } from '@ISalikhzyanov/devextreme/ui/file_manager';
import { GanttPredefinedContextMenuItem } from '@ISalikhzyanov/devextreme/ui/gantt';

@Component({
    template: ''
})
export abstract class DxoFileManagerContextMenu extends NestedOption {
    get commands(): Array<CustomCommand | Command> {
        return this._getOption('commands');
    }
    set commands(value: Array<CustomCommand | Command>) {
        this._setOption('commands', value);
    }

    get enabled(): boolean {
        return this._getOption('enabled');
    }
    set enabled(value: boolean) {
        this._setOption('enabled', value);
    }

    get items(): Array<dxFileManagerContextMenuItem | FileManagerPredefinedContextMenuItem | GanttPredefinedContextMenuItem | any | { beginGroup?: boolean, closeMenuOnClick?: boolean, disabled?: boolean, icon?: string, items?: Array<dxContextMenuItem>, name?: GanttPredefinedContextMenuItem | string, selectable?: boolean, selected?: boolean, template?: any, text?: string, visible?: boolean }> {
        return this._getOption('items');
    }
    set items(value: Array<dxFileManagerContextMenuItem | FileManagerPredefinedContextMenuItem | GanttPredefinedContextMenuItem | any | { beginGroup?: boolean, closeMenuOnClick?: boolean, disabled?: boolean, icon?: string, items?: Array<dxContextMenuItem>, name?: GanttPredefinedContextMenuItem | string, selectable?: boolean, selected?: boolean, template?: any, text?: string, visible?: boolean }>) {
        this._setOption('items', value);
    }
}
