# Test Code Blocks Feature

This is a test file to verify the side-by-side code block display feature in the speed reader.

Here's some regular text before the first code block. This should appear in normal speed reading mode.

```javascript
function greetUser(name) {
    const greeting = `Hello, ${name}!`;
    console.log(greeting);
    return greeting;
}

// Call the function
greetUser("World");
```

After the first code block, we have more regular text. The code should have been displayed in the side panel while this text continues in the speed reader.

Here's another code block with a different language:

```python
def calculate_fibonacci(n):
    if n <= 1:
        return n
    else:
        return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# Example usage
for i in range(10):
    print(f"Fibonacci({i}) = {calculate_fibonacci(i)}")
```

And some more text after the second code block. The side panel should now show the Python code.

Let's add one more code block without language specification:

```
This is a generic code block
without any specific language.
It should still display properly
in the side panel.
```

Finally, we end with some regular text to ensure the code panel hides when no more code blocks are encountered.
