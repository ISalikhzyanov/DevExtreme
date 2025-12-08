import * as React from 'react';
import {
  memo, forwardRef, useImperativeHandle, useRef, useMemo, ForwardedRef, Ref, ReactElement,
} from 'react';
import dxAccordion, {
  Properties,
} from '@ISalikhzyanov/devextreme/ui/accordion';

import type {
  dxAccordionItem, ContentReadyEvent, DisposingEvent, InitializedEvent, ItemClickEvent, ItemContextMenuEvent, ItemHoldEvent, ItemRenderedEvent, ItemTitleClickEvent,
} from '@ISalikhzyanov/devextreme/ui/accordion';
import type { CollectionWidgetItem } from '@ISalikhzyanov/devextreme/ui/collection/ui.collection_widget.base';
import type { template } from '@ISalikhzyanov/devextreme/common';
import type * as AccordionTypes from '@ISalikhzyanov/devextreme/ui/accordion_types';
import NestedOption from './core/nested-option';
import {
  Component as BaseComponent, IHtmlOptions, ComponentRef, NestedComponentMeta,
} from './core/component';

'use client';
export { ExplicitTypes } from '@ISalikhzyanov/devextreme/ui/accordion';

type ReplaceFieldTypes<TSource, TReplacement> = {
  [P in keyof TSource]: P extends keyof TReplacement ? TReplacement[P] : TSource[P];
};

interface IAccordionOptionsNarrowedEvents<TItem = any, TKey = any> {
  onContentReady?: ((e: ContentReadyEvent<TItem, TKey>) => void);
  onDisposing?: ((e: DisposingEvent<TItem, TKey>) => void);
  onInitialized?: ((e: InitializedEvent<TItem, TKey>) => void);
  onItemClick?: ((e: ItemClickEvent<TItem, TKey>) => void);
  onItemContextMenu?: ((e: ItemContextMenuEvent<TItem, TKey>) => void);
  onItemHold?: ((e: ItemHoldEvent<TItem, TKey>) => void);
  onItemRendered?: ((e: ItemRenderedEvent<TItem, TKey>) => void);
  onItemTitleClick?: ((e: ItemTitleClickEvent<TItem, TKey>) => void);
}

type IAccordionOptions<TItem = any, TKey = any> = React.PropsWithChildren<ReplaceFieldTypes<Properties<TItem, TKey>, IAccordionOptionsNarrowedEvents<TItem, TKey>> & IHtmlOptions & {
  dataSource?: Properties<TItem, TKey>['dataSource'];
  itemRender?: (...params: any) => React.ReactNode;
  itemComponent?: React.ComponentType<any>;
  itemTitleRender?: (...params: any) => React.ReactNode;
  itemTitleComponent?: React.ComponentType<any>;
  defaultItems?: (any | dxAccordionItem | string)[];
  defaultSelectedIndex?: number;
  defaultSelectedItem?: any;
  defaultSelectedItemKeys?: any[];
  defaultSelectedItems?: any[];
  onItemsChange?: (value: (any | dxAccordionItem | string)[]) => void;
  onSelectedIndexChange?: (value: number) => void;
  onSelectedItemChange?: (value: any) => void;
  onSelectedItemKeysChange?: (value: any[]) => void;
  onSelectedItemsChange?: (value: any[]) => void;
}>;

interface AccordionRef<TItem = any, TKey = any> {
  instance: () => dxAccordion<TItem, TKey>;
}

const Accordion = memo(
  forwardRef(
    <TItem = any, TKey = any>(props: React.PropsWithChildren<IAccordionOptions<TItem, TKey>>, ref: ForwardedRef<AccordionRef<TItem, TKey>>) => {
      const baseRef = useRef<ComponentRef>(null);

      useImperativeHandle(ref, () => (
        {
          instance() {
            return baseRef.current?.getInstance();
          },
        }
      ), []);

      const subscribableOptions = useMemo(() => ['items', 'selectedIndex', 'selectedItem', 'selectedItemKeys', 'selectedItems'], []);
      const independentEvents = useMemo(() => ['onContentReady', 'onDisposing', 'onInitialized', 'onItemClick', 'onItemContextMenu', 'onItemHold', 'onItemRendered', 'onItemTitleClick'], []);

      const defaults = useMemo(() => ({
        defaultItems: 'items',
        defaultSelectedIndex: 'selectedIndex',
        defaultSelectedItem: 'selectedItem',
        defaultSelectedItemKeys: 'selectedItemKeys',
        defaultSelectedItems: 'selectedItems',
      }), []);

      const expectedChildren = useMemo(() => ({
        item: { optionName: 'items', isCollectionItem: true },
      }), []);

      const templateProps = useMemo(() => [
        {
          tmplOption: 'itemTemplate',
          render: 'itemRender',
          component: 'itemComponent',
        },
        {
          tmplOption: 'itemTitleTemplate',
          render: 'itemTitleRender',
          component: 'itemTitleComponent',
        },
      ], []);

      return (
        React.createElement(BaseComponent<React.PropsWithChildren<IAccordionOptions<TItem, TKey>>>, {
          WidgetClass: dxAccordion,
          ref: baseRef,
          subscribableOptions,
          independentEvents,
          defaults,
          expectedChildren,
          templateProps,
          ...props,
        })
      );
    },
  ),
) as <TItem = any, TKey = any>(props: React.PropsWithChildren<IAccordionOptions<TItem, TKey>> & { ref?: Ref<AccordionRef<TItem, TKey>> }) => ReactElement | null;

// owners:
// Accordion
type IItemProps = React.PropsWithChildren<{
  disabled?: boolean;
  html?: string;
  icon?: string;
  template?: ((itemData: CollectionWidgetItem, itemIndex: number, itemElement: any) => string | any) | template;
  text?: string;
  title?: string;
  titleTemplate?: (() => string | any) | template;
  visible?: boolean;
  render?: (...params: any) => React.ReactNode;
  component?: React.ComponentType<any>;
  titleRender?: (...params: any) => React.ReactNode;
  titleComponent?: React.ComponentType<any>;
}>;
const _componentItem = (props: IItemProps) => React.createElement(NestedOption<IItemProps>, {
  ...props,
  elementDescriptor: {
    OptionName: 'items',
    IsCollectionItem: true,
    TemplateProps: [{
      tmplOption: 'template',
      render: 'render',
      component: 'component',
    }, {
      tmplOption: 'titleTemplate',
      render: 'titleRender',
      component: 'titleComponent',
    }],
  },
});

const Item = Object.assign<typeof _componentItem, NestedComponentMeta>(_componentItem, {
  componentType: 'option',
});

export default Accordion;
export {
  Accordion,
  IAccordionOptions,
  AccordionRef,
  Item,
  IItemProps,
};

export { AccordionTypes };
