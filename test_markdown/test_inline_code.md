# Testing Inline Code vs Code Blocks

This is a test file to verify that inline code and code blocks are handled correctly.

## Short Inline Code (should stay in text with Consolas styling)

Here are some short inline code examples: `hello`, `world`, `foo`, `bar`, `test123`.

The variable `userName` should be displayed in Consolas font.

We can use `npm install` to install packages.

## Long Inline Code (should be treated as code blocks)

This is a very long inline code example: `this_is_a_very_long_variable_name_that_exceeds_twenty_characters` which should be treated as a code block.

## Regular Code Blocks (should be extracted as code blocks)

Here's a standard code block:

```javascript
function hello() {
    console.log("Hello world!");
}
```

And here's a code block with more backticks:

````markdown
```javascript
console.log("nested code");
```
````

## Mixed Content

The function `getData()` retrieves information, while the longer function name `getVeryLongFunctionNameThatExceedsTwentyCharacters()` will be treated differently.

You can run `ls -la` to list files, but this command `find /very/long/path/that/exceeds/twenty/characters -name "*.js"` will be treated as a code block.

## End

This should work correctly now!
