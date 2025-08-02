/*
 * Lightning 3 Application Framework Example
 *
 * This example demonstrates the NAF (Not A Framework) integration
 * with Lightning 3, showing how to create components with focus
 * management and key event handling.
 */

import { Component } from '../application/index.js';
import type { Stage } from '../core/Stage.js';
import type { CoreNodeProps } from '../core/CoreNode.js';

/**
 * Example Button Component
 *
 * Demonstrates:
 * - Component class with template
 * - Focus handling (onFocus/onBlur)
 * - Key event handling (onKeyPress)
 * - Lightning 2 familiar tag() syntax
 */
class ButtonComponent extends Component {
  template = {
    // Background node
    bg: {
      x: 0,
      y: 0,
      width: 200,
      height: 60,
      color: 0x333333ff, // Dark gray
    },

    // Title text (will be TextNode when text rendering is integrated)
    // For now this will be a regular Node since TextNode creation is not yet implemented
    title: {
      x: 100,
      y: 30,
      width: 0,
      height: 0,
      color: 0xffffffff, // White
      // text: 'Button', // This would make it a TextNode when text rendering is ready
    },
  };

  constructor(stage: Stage, props: CoreNodeProps) {
    super(stage, props);
  }

  override init(): void {
    console.log('Button component initialized');
  }

  override onMount(): void {
    console.log('Button component mounted');
  }

  override onFocus(): void {
    console.log('Button component received focus');

    // Change background color when focused
    const bg = this.tag('bg');
    if (bg) {
      bg.color = 0x666666ff; // Lighter gray
    }
  }

  override onBlur(): void {
    console.log('Button component lost focus');

    // Restore original background color
    const bg = this.tag('bg');
    if (bg) {
      bg.color = 0x333333ff; // Dark gray
    }
  }

  override onKeyPress(key: string): boolean {
    console.log(`Button received key: ${key}`);

    if (key === 'Enter' || key === ' ') {
      console.log('Button activated!');
      this.onClick();
      return true; // Stop propagation
    }

    return false; // Continue propagation
  }

  private onClick(): void {
    // Button click logic
    console.log('Button clicked');

    // Example: Scale animation effect (would need actual animation implementation)
    const bg = this.tag('bg');
    if (bg) {
      bg.scaleX = 0.95;
      bg.scaleY = 0.95;

      // Restore scale after animation (simplified)
      setTimeout(() => {
        if (bg) {
          bg.scaleX = 1.0;
          bg.scaleY = 1.0;
        }
      }, 100);
    }
  }
}

/**
 * Example Menu Component
 *
 * Demonstrates:
 * - Nested component structure
 * - Multiple child components
 * - Focus navigation between children
 */
class MenuComponent extends Component {
  template = {
    // Background
    bg: {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      color: 0x000000aa, // Semi-transparent black
    },

    // Menu items (Components)
    Button1: {
      type: ButtonComponent,
      props: { x: 50, y: 50 },
    },

    Button2: {
      type: ButtonComponent,
      props: { x: 50, y: 130 },
    },

    Button3: {
      type: ButtonComponent,
      props: { x: 50, y: 210 },
    },
  };

  private currentFocusIndex = 0;
  private menuItems: string[] = ['Button1', 'Button2', 'Button3'];

  override init(): void {
    console.log('Menu component initialized');

    // Focus first button by default
    this.focusButton(0);
  }

  override onKeyPress(key: string): boolean {
    console.log(`Menu received key: ${key}`);

    switch (key) {
      case 'ArrowUp':
        this.navigateUp();
        return true;

      case 'ArrowDown':
        this.navigateDown();
        return true;

      case 'Escape':
        console.log('Menu escape pressed');
        return true;

      default:
        // Let the focused button handle the key
        return false;
    }
  }

  private navigateUp(): void {
    const newIndex = Math.max(0, this.currentFocusIndex - 1);
    this.focusButton(newIndex);
  }

  private navigateDown(): void {
    const newIndex = Math.min(
      this.menuItems.length - 1,
      this.currentFocusIndex + 1,
    );
    this.focusButton(newIndex);
  }

  private focusButton(index: number): void {
    // Blur current button
    const currentButtonName = this.menuItems[this.currentFocusIndex];
    if (currentButtonName) {
      const currentButton = this.tag(currentButtonName);
      if (currentButton && currentButton instanceof Component) {
        currentButton.blur();
      }
    }

    // Focus new button
    this.currentFocusIndex = index;
    const newButtonName = this.menuItems[this.currentFocusIndex];
    if (newButtonName) {
      const newButton = this.tag(newButtonName);
      if (newButton && newButton instanceof Component) {
        newButton.focus();
      }
    }
  }
}

/**
 * Example App Component
 *
 * Demonstrates:
 * - Root application component
 * - Global key handling
 * - Application initialization
 */
export class ExampleApp extends Component {
  template = {
    // Main background
    background: {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      color: 0x001122ff, // Dark blue
    },

    // Main menu
    MainMenu: {
      type: MenuComponent,
      props: { x: 760, y: 390 }, // Center of 1920x1080
    },
  };

  override init(): void {
    console.log('Example App initialized');
    console.log('Lightning 3 Application Framework (NAF Integration) Demo');
    console.log(
      'Use Arrow Keys to navigate, Enter to select, Escape for menu actions',
    );
  }

  override onMount(): void {
    console.log('Example App mounted to render tree');

    // Focus the main menu
    const menu = this.tag('MainMenu');
    if (menu && menu instanceof Component) {
      menu.focus();
    }
  }

  override onKeyPress(key: string): boolean {
    console.log(`App received global key: ${key}`);

    // Handle global app keys
    if (key === 'F1') {
      console.log('Help requested');
      return true;
    }

    // Let child components handle other keys
    return false;
  }
}

/**
 * Example usage (this would be called from main application code):
 *
 * ```typescript
 * // Initialize Lightning 3 renderer
 * const stage = new Stage({ ... });
 *
 * // Create and mount the app
 * const app = new ExampleApp(stage, stage.createNode({}).props);
 * stage.root.children.push(app);
 *
 * // Focus management and key events would be handled by focus manager (Phase 3)
 * // For now, you can manually test focus and key events:
 * app.focus();
 * app.handleKeyEvent('ArrowDown');
 * app.handleKeyEvent('Enter');
 * ```
 */
