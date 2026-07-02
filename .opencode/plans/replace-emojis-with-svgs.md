# Replace Admin/Member Emoji Icons with Inline SVGs

## Changes

### 1. `src/components/GroupManager.jsx` — Line 278
Replace `{m.role === 'admin' ? '👑' : '👤'} {m.user_id.slice(0, 8)}…`
```jsx
{m.role === 'admin'
  ? <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><path d="M6 1.5L7.5 4.5L10.5 3L9 6.5L10.5 10.5H1.5L3 6.5L1.5 3L4.5 4.5L6 1.5Z"/></svg>
  : <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><circle cx="6" cy="3.5" r="2.5"/><path d="M0 11.5C0 9 4 8 6 8s6 1 6 3.5"/></svg>}
{m.user_id.slice(0, 8)}…
```

### 2. `src/components/GroupManager.jsx` — Line 363
Replace `{m.role === 'admin' ? '👑 Admin' : '👤 Member'}`
```jsx
{m.role === 'admin'
  ? <><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><path d="M6 1.5L7.5 4.5L10.5 3L9 6.5L10.5 10.5H1.5L3 6.5L1.5 3L4.5 4.5L6 1.5Z"/></svg> Admin</>
  : <><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><circle cx="6" cy="3.5" r="2.5"/><path d="M0 11.5C0 9 4 8 6 8s6 1 6 3.5"/></svg> Member</>}
```

### 3. `src/components/MediaCard.jsx` — Line 183
Replace `{userRole === 'admin' ? '👑 ' : userRole === 'member' ? '👤 ' : ''}`
```jsx
{userRole === 'admin'
  ? <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><path d="M6 1.5L7.5 4.5L10.5 3L9 6.5L10.5 10.5H1.5L3 6.5L1.5 3L4.5 4.5L6 1.5Z"/></svg>
  : userRole === 'member'
    ? <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><circle cx="6" cy="3.5" r="2.5"/><path d="M0 11.5C0 9 4 8 6 8s6 1 6 3.5"/></svg>
    : ''}
```

### 4. `src/components/MediaCard.jsx` — Line 199
Replace `'👑 '` with:
```jsx
<svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><path d="M6 1.5L7.5 4.5L10.5 3L9 6.5L10.5 10.5H1.5L3 6.5L1.5 3L4.5 4.5L6 1.5Z"/></svg>
```

## SVG Icons Used
- **Crown** (admin): 12x12, 3-point crown silhouette with pointed base
- **User** (member): 12x12, circle head + rounded shoulders path
- Both use `fill="currentColor"` to inherit parent text color automatically
