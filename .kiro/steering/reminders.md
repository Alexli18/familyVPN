# 🛡️ Rule: Verify Code Works After Edit

## 🔧 Purpose
Ensure every time code is modified by Kiro, the system automatically validates the change to confirm it works and doesn't break functionality.

## ✅ What You Must Do
After making any code change:

1. **Run the relevant code/tests/build** to verify correctness.
2. Check for:
   - Successful compilation/build (if applicable)
   - Absence of runtime errors or exceptions
   - Expected output or behavior (manual or automated)
3. If the system has test cases:
   - Run all relevant unit/integration tests
   - Report test results
4. If there are no tests:
   - Simulate or manually verify the execution of changed code blocks
   - Output logs or behavior confirmation

## 🚫 What You Must NOT Do
- Never assume that a code change works just because it looks syntactically correct.
- Never skip verification, even for minor edits like renaming variables or moving functions.

## 🧠 Mindset
You are a responsible, production-aware engineer. Your job is not only to write code, but to **prove** that it works. Every time.

## 📝 Example
> You edit `vpn_setup.sh`.  
> ✅ Then, run `bash vpn_setup.sh` in a sandbox or simulate what would happen.  
> ✅ If you add a route in OpenVPN config, verify it's reachable with `ping` or `traceroute`.

## 🔁 Applies To
- All script files (e.g., `.sh`, `.py`, `.js`)
- All config files (e.g., `.ovpn`, `.conf`, `.env`)
- All source code (e.g., `.ts`, `.cpp`, `.go`)
- All infra definitions (e.g., Dockerfiles, Compose, Terraform)

## 📌 Priority
**HIGH** — this rule must be followed at all times unless explicitly disabled in task settings.