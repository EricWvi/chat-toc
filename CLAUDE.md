# Chat TOC - Detailed Documentation

## Overview

Chat TOC is a browser userscript that adds a draggable Table of Contents (TOC) for common AI chat websites. It helps users navigate through long conversations by providing a sidebar with clickable links to each user message.

## Features

### Core Functionality
- **Draggable TOC Widget**: A floating, draggable sidebar that can be positioned anywhere on the screen
- **Auto-Detection**: Automatically detects user messages across multiple AI chat platforms
- **Theme Adaptation**: Dynamically adapts to light/dark themes of the host website
- **Persistent Position**: Remembers the TOC position between page loads using localStorage
- **Collapsible Interface**: Can be minimized to save screen space
- **Smooth Navigation**: Click any item to smoothly scroll to that message with highlighting

### Supported Platforms
The script supports the following AI chat platforms:

1. **GitHub Copilot** (`github.com/copilot`)
2. **ChatGPT** (`chatgpt.com`)
3. **Claude AI** (`claude.ai`)
4. **DeepSeek Chat** (`chat.deepseek.com`)
5. **Qwen Chat** (`chat.qwen.ai`)
6. **Yuanbao (Tencent)** (`yuanbao.tencent.com`)
7. **MiniMax Chat** (`chat.minimaxi.com`)
8. **Doubao** (`doubao.com`)
9. **ChatGLM** (`chatglm.cn`)
10. **Tongyi Qianwen** (`tongyi.com`)

## Technical Architecture

### Strategy Pattern Implementation
The script uses a strategy pattern to handle different website layouts:

```javascript
const strategies = {
    'chatgpt.com': function() {
        return [...document.querySelectorAll('article')]
            .filter((_, idx) => idx % 2 == 0)
            .map(article => article.querySelector('div'));
    },
    'claude.ai': function() {
        return [...document.querySelectorAll('[data-testid="user-message"]')];
    },
    // ... other strategies
};
```

Each strategy knows how to locate user messages on its specific platform.

### Theme Detection System
The script includes sophisticated theme detection that:

1. **Checks Platform-Specific Attributes**: Looks for `data-color-mode`, `data-color-theme`, and `data-theme` attributes
2. **CSS Class Detection**: Checks for common dark/light theme CSS classes
3. **System Preference Fallback**: Uses `prefers-color-scheme` media query as fallback
4. **Dynamic Updates**: Watches for theme changes and updates styling accordingly

### Color Schemes
- **Dark Theme**: GitHub-inspired dark colors (`#0d1117` background, `#f0f6fc` text)
- **Light Theme**: Clean light colors (`#ffffff` background, `#24292f` text)

## Key Components

### 1. TOC Container Creation
```javascript
function createTOC() {
    // Creates the main widget structure
    // Sets up styling based on current theme
    // Applies saved position from localStorage
}
```

### 2. Message Detection
```javascript
function updateTOC() {
    // Uses appropriate strategy for current platform
    // Extracts text content from user messages
    // Updates TOC list with numbered items
}
```

### 3. Drag Functionality
```javascript
function setupDragFunctionality() {
    // Enables dragging from the header
    // Constrains movement within viewport
    // Saves position to localStorage
}
```

### 4. Change Detection
The script uses a MutationObserver to watch for:
- New messages being added to the chat
- Theme changes on the page
- DOM structure modifications

## User Interface

### Header
- **Title**: "Chat TOC"
- **Drag Handle**: Visual indicator (⋮⋮) for dragging
- **Toggle Button**: Minimize/expand functionality (− / +)

### Content Area
- **Scrollable List**: Numbered list of user messages
- **Hover Effects**: Visual feedback on interaction
- **Text Truncation**: Long messages are truncated with ellipsis
- **Custom Scrollbar**: Themed scrollbar matching the platform

### Interactive Features
- **Click to Navigate**: Click any item to scroll to that message
- **Message Highlighting**: Briefly highlights the target message
- **Responsive Design**: Adapts to window resizing
- **Collision Detection**: Prevents TOC from moving outside viewport

## Performance Optimizations

### Debounced Updates
Updates are debounced with a 1-second delay to prevent excessive DOM queries during rapid changes.

### Change Detection
Only updates the TOC when:
- Message count changes
- Message content changes
- No unnecessary re-renders

### Memory Management
- Cleans up event listeners when recreating TOC
- Removes old style elements before adding new ones
- Efficient XPath and querySelector usage

## Browser Compatibility

### UserScript Managers
- **Tampermonkey** (Recommended)
- **Greasemonkey**
- **Violentmonkey**

### Supported Browsers
- Chrome/Chromium
- Firefox
- Safari
- Edge

## Installation & Usage

### Installation
1. Install a userscript manager (Tampermonkey recommended)
2. Install the script from the provided URL or copy the code
3. Navigate to any supported AI chat platform

### Usage
1. **Initial Load**: TOC appears automatically when messages are detected
2. **Navigation**: Click any numbered item to jump to that message
3. **Positioning**: Drag the header to reposition the TOC
4. **Minimize**: Click the "−" button to collapse the TOC
5. **Expand**: Click the "+" button to expand the collapsed TOC

## Configuration

### localStorage Keys
- `copilot-toc-position`: Stores TOC position as JSON `{x, y}`

### Customizable Styling
The script includes comprehensive CSS that can be modified:
- Colors and themes
- Dimensions and spacing
- Animation timings
- Scrollbar appearance

## Error Handling

### Graceful Degradation
- Falls back to default strategy if platform not recognized
- Continues working if localStorage is unavailable
- Handles missing DOM elements gracefully

### Defensive Programming
- Null checks before DOM manipulation
- Try-catch blocks for JSON parsing
- Bounds checking for positioning

## Development Notes

### Adding New Platforms
1. Add the domain to `@match` directives in the userscript header
2. Create a new strategy function in the `strategies` object
3. Test message detection and text extraction

### Debugging
The script includes console logging for:
- TOC updates and message count changes
- Theme detection and changes
- Error conditions

### Future Enhancements
Potential improvements could include:
- Message type detection (user vs assistant)
- Search functionality within the TOC
- Export/import of conversation structure
- Integration with browser bookmarks
- Keyboard shortcuts for navigation

## Version History

- **v1.4.6**: Current version with theme adaptation and improved drag functionality
- Supports 10+ AI chat platforms
- Enhanced performance and reliability
- Persistent positioning and state management

## License

MIT License - See LICENSE file for full details.

## Author

Eric Wang (@EricWvi) - 2025
