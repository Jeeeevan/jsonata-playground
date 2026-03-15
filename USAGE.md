# JSONata Playground - Usage Guide

## Overview

The JSONata Playground extension provides a live preview interface within VS Code, similar to try.jsonata.org. It features a split-screen layout with three panels for real-time JSONata expression evaluation.

## Features

- **Three-Panel Interface**:
  1. **JSON Input Panel**: Enter or paste your JSON data
  2. **JSONata Expression Panel**: Write your JSONata query
  3. **Output Panel**: View the real-time evaluation result

- **Live Evaluation**: Results update automatically with 300ms debounce as you type
- **Error Handling**: Clear error messages when expressions fail
- **Theme Support**: Automatically adapts to VS Code light/dark themes
- **Status Information**: Shows character count of output and error messages

## How to Use

### Opening the Playground

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "JSONata Playground" and select "Open JSONata Playground"
3. A new webview panel will open with the three-panel interface

### Example Usage

**JSON Input:**
```json
{
  "name": "John",
  "age": 30,
  "items": [1, 2, 3, 4, 5]
}
```

**JSONata Expression:**
```
$.*
```

**Output:**
```json
"John"
30
[
  1,
  2,
  3,
  4,
  5
]
```

## JSONata Syntax Tips

- `$` - Root scope
- `$.*` - All properties at root level
- `$.items[0]` - Array indexing
- `$.items[$count($)]` - Get last item (using built-in functions)
- `$[name="John"]` - Filter by condition
- `$.items.($*2)` - Map function

For more information on JSONata syntax, visit: [JSONata Documentation](https://docs.jsonata.org/)

## Performance

- 300ms debounce prevents excessive re-evaluation while typing
- Uses JSONata v2.x engine for optimal performance
- Supports complex expressions and large datasets

## Keyboard Shortcuts

- `Ctrl+A` / `Cmd+A` - Select all in focused panel
- `Tab` - Move between panels
- Auto-evaluation on input changes

## Notes

- The extension evaluates expressions asynchronously
- Complex expressions may take a few moments to process
- The output is formatted with 2-space indentation for readability
