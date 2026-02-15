# 🐛 Bug Fixes Log

## Bug #1: Input Node JSON Textarea Not Accepting Text Input
**Date**: February 14, 2026  
**Reported By**: User  
**Severity**: High (blocks core functionality)  
**Status**: ✅ FIXED

### Problem
When selecting an input node and trying to enter text in the "Trigger Data (JSON)" textarea, the input field was not accepting text. Users could only enter data via copy-pasting.

### Root Cause
The textarea was using a **controlled component** pattern with `value` and `onChange`, where the `onChange` handler attempted to parse JSON on **every keystroke**. 

When the JSON was temporarily invalid (which happens while typing, e.g., typing `{` before completing the object), the `JSON.parse()` would fail silently in the catch block, preventing the state update and blocking further input.

```tsx
// BEFORE (Broken)
<textarea
    value={JSON.stringify((selectedNode.data as any).config?.data || {}, null, 2)}
    onChange={(e) => {
        try {
            const data = JSON.parse(e.target.value); // Fails while typing!
            setNodes(/* update state */);
        } catch (err) { } // Silent failure blocks input
    }}
/>
```

### Solution
Changed from **controlled** to **uncontrolled** component pattern using `defaultValue` and `onBlur` instead of `value` and `onChange`. This allows users to type freely, and JSON validation only happens when they finish editing (on blur).

```tsx
// AFTER (Fixed)
<textarea
    defaultValue={JSON.stringify((selectedNode.data as any).config?.data || {}, null, 2)}
    onBlur={(e) => {
        try {
            const data = JSON.parse(e.target.value); // Only validates on blur
            setNodes(/* update state */);
        } catch (err) {
            toast.error('Invalid JSON format. Please check your syntax.'); // User feedback
        }
    }}
/>
```

### Changes Made
1. **File**: `/app/(dashboard)/builder/page.tsx`
2. **Lines**: 438-456 (Input node trigger data)
3. **Lines**: 625-645 (Fallback JSON editor)

**Changes**:
- Changed `value` → `defaultValue`
- Changed `onChange` → `onBlur`
- Added `focus:ring-2 focus:ring-primary-500/50` for better UX
- Added error toast for invalid JSON
- Added helper text: "Type freely, JSON validates on blur"

### Testing
✅ Can now type freely in JSON textarea  
✅ JSON validates only when clicking away (blur)  
✅ Error message shows if JSON is invalid  
✅ Focus ring appears when editing  
✅ Copy-paste still works  

### Impact
- **Before**: Users frustrated, couldn't enter data manually
- **After**: Smooth typing experience, clear error feedback

### Lessons Learned
- Avoid parsing/validating on every keystroke for complex formats like JSON
- Use `onBlur` for validation when immediate feedback isn't critical
- Always provide user feedback for validation errors (toast messages)
- Uncontrolled components are better for free-form text input

---

## Bug #2: [Future bugs will be logged here]

---

*Last Updated: February 14, 2026*
