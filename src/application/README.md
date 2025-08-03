# Lightning 3 Application Framework

This directory contains the NAF (Not A Framework) prototype integration into Lightning 3, providing enhanced application development capabilities while maintaining full compatibility with the core Lightning 3 renderer.

## Overview

The application framework extends Lightning 3's core capabilities with:

- **Focus Management**: Built-in focus handling with onFocus/onBlur lifecycle hooks
- **Key Event Routing**: Hierarchical key event handling with propagation control
- **Component Architecture**: Template-driven component development
- **Lightning 2 Compatibility**: Familiar tag() syntax for child finding
- **Zero Abstraction**: Direct access to all Lightning 3 core functionality

## Core Classes

### Node

Enhanced CoreNode with focus and key routing capabilities:

```typescript
import { Node } from './application';

class MyNode extends Node {
  onFocus() {
    console.log('Node received focus');
  }

  onKeyPress(key: string): boolean {
    if (key === 'Enter') {
      // Handle enter key
      return true; // Stop propagation
    }
    return false; // Continue propagation
  }
}
```

### TextNode

Enhanced CoreTextNode with focus capabilities:

```typescript
import { TextNode } from './application';

class MyTextNode extends TextNode {
  onFocus() {
    // Text node received focus
  }
}
```

### Component

Template-driven component development:

```typescript
import { Component } from './application';

class MyComponent extends Component {
  template = {
    // Capital case = Component references
    Header: HeaderComponent,
    Menu: { type: MenuComponent, props: { visible: true } },

    // lowercase = Node/TextNode properties
    bg: { x: 0, y: 0, width: 1920, height: 1080, color: 0x000000 },
    title: { text: 'Hello World', fontSize: 32, color: 0xffffff },

    // Nested templates
    content: {
      item1: { text: 'Item 1' },
      item2: { text: 'Item 2' },
    },
  };

  init() {
    // Component initialization
  }

  mount() {
    // Component mounted to render tree
  }

  onKeyPress(key: string): boolean {
    // Handle component key events
    return false;
  }
}
```

## Template System

The template system provides Lightning 2 familiar syntax with Lightning 3 performance:

### Template Rules

1. **Capital case keys** = Component references
2. **Lower case keys** = Node/TextNode properties
3. **Text property present** = Automatic TextNode creation
4. **All Lightning 3 properties** = Transparently passed through

### Template Examples

```typescript
template = {
  // Component
  Menu: {
    type: MenuComponent,
    props: { x: 100, y: 200, visible: true },
  },

  // Regular Node
  background: {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0x000000,
    shader: SolidColorShader,
  },

  // TextNode (has 'text' property)
  title: {
    text: 'Hello World',
    x: 100,
    y: 50,
    fontSize: 32,
    color: 0xffffff,
  },

  // Nested template (anonymous component)
  sidebar: {
    item1: { text: 'Item 1', y: 0 },
    item2: { text: 'Item 2', y: 50 },
    item3: { text: 'Item 3', y: 100 },
  },
};
```

## Lightning 2 Compatibility

### tag() Method

Find children using familiar Lightning 2 syntax:

```typescript
const header = this.tag('Header'); // Find Header component
const title = this.tag('title'); // Find title text node
const bg = this.tag('background'); // Find background node
```

### Component Lifecycle

```typescript
class MyComponent extends Component {
  init() {
    // Called once during component creation
    // Set up initial state, process dynamic templates
  }

  mount() {
    // Called when added to render tree
    // Start animations, timers, event listeners
  }

  unmount() {
    // Called when removed from render tree
    // Clean up animations, timers, event listeners
  }

  destroy() {
    // Called when component is destroyed
    // Final cleanup of resources
  }
}
```

## Focus Management

### Focus Events

```typescript
class FocusableNode extends Node {
  onFocus() {
    // Node received focus
    this.color = 0xffffff; // Highlight
  }

  onBlur() {
    // Node lost focus
    this.color = 0x888888; // Dim
  }
}
```

### Programmatic Focus

```typescript
const node = this.tag('myNode');
node.focus(); // Set focus
node.blur(); // Remove focus

if (node.hasFocus) {
  console.log('Node has focus');
}
```

## Key Event Handling

TBD

### Event Flow

1. Key event received by focused node
2. onKeyPress() called on focused node
3. If handled (returns true), stop propagation
4. If not handled (returns false), propagate to parent
5. Continue until handled or reach root

## Performance Considerations

### Optimizations

- **Tag Cache**: Child lookups are cached for performance
- **For/While Loops**: Used instead of array methods in hot paths
- **Early Returns**: Reduce nesting in critical paths
- **Minimal GC Pressure**: Reuse objects where possible

### Best Practices

- Override only needed lifecycle methods
- Cache expensive computations
- Use const for frequently accessed properties
- Prefer specific key handlers over generic ones

## Development Status

This is Phase 1 of the NAF integration. Current status:

- ✅ Node class with focus and key routing
- ✅ TextNode class with focus capabilities
- ✅ Component class with template processing
- ✅ Lightning 2 compatible tag() syntax
- ✅ Focus Manager
- ✅ Key Event System

## Next Steps

1. **Phase 2**: Integrate text rendering system
2. **Phase 3**: Implement global focus manager and key event system
3. **Phase 4**: Add router and state management
4. **Phase 5**: Advanced features (transitions, animations, etc.)
