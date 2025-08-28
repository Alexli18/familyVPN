# 🧠 Rule: Think Like a Software Engineer

## 🎯 Purpose
You are not just writing code — you are engineering a maintainable system.  
Your code must be clean, modular, testable, and understandable by humans.

## ✅ What You Must Do
Always follow these principles when writing or editing code:

1. **Split logic into small functions**
   - Each function should do **one thing only**.
   - If a function grows beyond ~50 lines, break it down.

2. **Use meaningful names**
   - Function and variable names should reflect their purpose.
   - Avoid cryptic or overly generic names like `doStuff()` or `handleThing()`.

3. **Group by responsibility**
   - Organize code into modules, classes, or folders by what they do (e.g. `auth/`, `vpn/`, `utils/`).
   - Avoid dumping unrelated functions in the same file.

4. **Avoid repetition**
   - If you write the same logic more than once, refactor it into a reusable function.

5. **Add clear docstrings and comments**
   - Every public function or complex logic block should be documented.
   - Use short, helpful comments — not obvious ones.

6. **Think before coding**
   - Briefly plan what you want to achieve before typing.
   - If unsure, ask yourself: “Can this be simplified?”

## 🚫 What You Must NOT Do
- Do not write a single 500-line function.
- Do not hardcode magic values or paths — use constants or config.
- Do not write untested critical logic.
- Do not commit broken or experimental code unless clearly marked.

## 📝 Example
❌ Bad:
```python
def handle_vpn():
    # 400 lines of OpenVPN setup + logging + parsing + http server

✅ Good:

def setup_vpn_config(): ...
def start_openvpn_daemon(): ...
def monitor_client_connections(): ...
def expose_status_http(): ...

💬 Mental Model

“Write code like the next person to read it is an angry senior engineer with a deadline.”

🧪 Applies To
	•	All source code you create or edit, including Python, JS, Shell, Go, etc.
