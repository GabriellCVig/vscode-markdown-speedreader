# Markdown Speed Reader - VSCode Extension

A powerful VSCode extension that enables speed reading of markdown and text files with configurable reading speeds, intelligent text processing, and an intuitive user interface.

## Features

- 🚀 **Speed Reading**: Read text at configurable speeds (50-1000 WPM)
- 🎯 **ORP Highlighting**: Optimal Recognition Point highlighting for enhanced reading efficiency
- 📝 **Markdown Support**: Intelligent markdown parsing with code block extraction
- 🎮 **Intuitive Controls**: Play/pause/stop with keyboard shortcuts
- 📊 **Progress Tracking**: Visual progress bar with seeking capability
- ⚙️ **Configurable Settings**: Customizable reading speed, font size, ORP colors, and behavior
- 🎨 **VSCode Integration**: Seamless theme integration and context menu options
- 📱 **Responsive Design**: Works well on different screen sizes

## Installation

1. **From Source**:
   ```bash
   git clone <repository-url>
   cd markdownspeedreader
   npm install
   npm run compile
   ```

2. **Development**: Press `F5` in VSCode to launch a new Extension Development Host window

## Usage

### Commands

The extension provides three main commands accessible via the Command Palette (`Ctrl+Shift+P`):

- **Speed Reader: Speed Read Current File** - Read the currently open file
- **Speed Reader: Speed Read Selection** - Read only the selected text
- **Speed Reader: Speed Read File...** - Open a file picker to select a file to read

### Context Menu Options

- **Right-click in editor**: Access speed reading options for current file or selection
- **Right-click on .md/.txt files in Explorer**: Quick access to speed read specific files

### Keyboard Shortcuts

While the speed reader is active:
- **Space**: Play/Pause reading
- **Escape**: Stop reading and return to beginning

### Speed Reading Interface

The speed reading interface includes:

1. **Reading Area**: Large, centered display of the current word with ORP highlighting
2. **Playback Controls**: Play, Pause, and Stop buttons
3. **Speed Control**: Adjustable WPM (Words Per Minute) input
4. **Progress Bar**: Visual progress indicator with click-to-seek functionality
5. **Settings**: Toggle punctuation pausing and customize ORP highlight color

### ORP (Optimal Recognition Point) Highlighting

The extension features advanced ORP highlighting to enhance reading speed and comprehension:

- **What is ORP**: The optimal character position in each word where your eye should focus for fastest recognition
- **Algorithm**: Uses the proven formula `Math.floor(word.length * 0.3)` to calculate the ideal focus point
- **Visual Design**: The ORP character appears bold and colored (default: red #ff4444)
- **Examples**:
  - "cat" → **c**at (1st character)
  - "quick" → q**u**ick (2nd character)
  - "reading" → re**a**ding (3rd character)
  - "understanding" → und**e**rstanding (4th character)
- **Customization**: Use the color picker in the interface to change the highlight color in real-time
- **Benefits**: Reduces eye movement and increases reading speed by providing a consistent focal point

## Configuration

Configure the extension via VSCode settings (`File > Preferences > Settings`):

```json
{
  "speedreader.defaultWPM": 250,
  "speedreader.pauseOnPunctuation": true,
  "speedreader.fontSize": 24
}
```

### Available Settings

- **`speedreader.defaultWPM`** (default: 250)
  - Default reading speed in words per minute
  - Range: 50-1000 WPM

- **`speedreader.pauseOnPunctuation`** (default: true)
  - Pause briefly after punctuation marks for better comprehension

- **`speedreader.fontSize`** (default: 24)
  - Font size for the speed reading display
  - Range: 12-48 pixels

## Supported File Types

### Primary Support
- **Markdown** (.md, .markdown)
  - Automatic markdown detection
  - Code block extraction
  - Clean text conversion

### Secondary Support
- **Plain Text** (.txt)
  - Direct text processing
  - Optimal for prose and documentation

### Fallback Support
- **Any text-based file**
  - User confirmation required
  - Basic text processing

## How It Works

### Text Processing Pipeline

1. **File Reading**: Content is read from the selected file or editor
2. **Format Detection**: Automatic detection of markdown vs plain text
3. **Parsing**: Markdown is converted to clean plain text, code blocks are extracted
4. **Tokenization**: Text is split into individual words
5. **Display**: Words are presented sequentially at the configured speed

### Smart Features

- **Adaptive Timing**: Longer words are displayed slightly longer for better comprehension
- **Punctuation Awareness**: Optional pausing after sentence-ending punctuation
- **Progress Tracking**: Real-time progress with seeking capability
- **Memory Efficient**: Optimized for large documents

## Development

### Project Structure

```
src/
├── extension.ts          # Main extension entry point
├── file_reader.ts        # File I/O operations
├── markdown_parser.ts    # Text processing and markdown parsing
├── speedreading_engine.ts # Core reading logic and timing
├── ui_module.ts          # UI management and webview
└── test/                 # Test files
```

### Key Classes

- **`SpeedreadingEngine`**: Core logic for text processing and timing
- **`SpeedreadingUI`**: Webview management and user interface
- **`MarkdownParser`**: Markdown to text conversion with code block handling
- **`FileReader`**: File system operations with error handling

### Building

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch

# Run tests
npm test

# Lint code
npm run lint
```

### Testing

The extension includes comprehensive testing:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Architecture

The extension follows a modular architecture with clear separation of concerns:

- **Extension Host**: VSCode integration and command registration
- **Engine**: Core speed reading logic and state management
- **UI**: Webview-based interface with real-time updates
- **Parser**: Text processing with markdown support
- **File Reader**: Robust file I/O with error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style

- Use TypeScript with strict mode
- Follow VSCode extension guidelines
- Include TSDoc comments for public APIs
- Maintain test coverage above 80%

## Troubleshooting

### Common Issues

**Extension not activating:**
- Ensure VSCode version is 1.100.0 or higher
- Check that the extension is enabled in the Extensions panel

**Speed reading not starting:**
- Verify file contains readable text
- Check that the file type is supported
- Try selecting text manually and using "Speed Read Selection"

**Performance issues:**
- Reduce WPM setting for very large files
- Close other resource-intensive extensions
- Restart VSCode if memory usage is high

**UI not displaying correctly:**
- Ensure webview is enabled in VSCode settings
- Try closing and reopening the speed reader panel
- Check browser console for JavaScript errors

### Getting Help

- Check the [Issues](../../issues) page for known problems
- Create a new issue with detailed reproduction steps
- Include VSCode version, extension version, and file type being read

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## Changelog

### Version 0.0.1
- Initial release
- Basic speed reading functionality
- Markdown and text file support
- Configurable reading speeds
- VSCode theme integration
- Keyboard shortcuts and context menus

## Roadmap

### Upcoming Features
- Reading statistics and analytics
- Custom themes and color schemes
- Code syntax highlighting for programming files
- Reading bookmarks and session saving
- Multi-language support
- Cloud synchronization

### Long-term Goals
- Advanced reading algorithms (variable speed, focus modes)
- Integration with productivity tools
- Collaborative reading features
- Machine learning-based reading optimization

---

**Happy Speed Reading!** 📚⚡
