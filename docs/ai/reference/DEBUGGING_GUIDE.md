# Multi-Player Testing & Connection Debugging Guide

## 🧪 **Multi-Player Testing Solutions**

### **1. Incognito Windows (Easiest)**
- **✅ Simple**: Open multiple incognito windows in same browser
- **✅ Isolated**: Each window has separate authentication & WebSocket connections
- **✅ No setup**: Works immediately with different user accounts
- **Process**: 
  1. Open incognito window #1 → Login as Host
  2. Open incognito window #2 → Login as Player 1
  3. Open incognito window #3 → Login as Player 2
  4. Each maintains separate real-time subscriptions

### **2. Multiple Browsers**
- Use Chrome, Firefox, Edge simultaneously
- Each browser maintains separate sessions
- Good for testing cross-browser compatibility

### **3. Local Network Testing**
- Use phone, tablet, laptop on same WiFi
- Most realistic multi-user experience
- Tests actual network latency

## 🔧 **Connection Debugging Tools**

### **1. ConnectionDebugger Component**
**Location**: Bottom-left corner (development mode only)
**Shows**:
- 🟢🟡🔴 Real-time connection status (OPEN/CONNECTING/CLOSED)
- Active subscription count
- Current user ID (first 8 chars)
- Last update timestamp

**Usage**: Automatically appears in development builds

### **2. Player Connection Indicators**
**Location**: Next to each player name in Host Dashboard
**Shows**:
- 🟢 Player connected & subscribed
- 🔴 Player disconnected
- 🟡 Player connecting
- 🟠 Connection error

**Tooltip**: Hover for detailed status and last seen time

## 🔄 **Refreshing Subscriptions**

### **Programmatic Refresh** (Recommended):
```typescript
// In component with subscription issues:
useEffect(() => {
  const subscription = supabase.channel('my-channel').subscribe();
  
  // To refresh without page reload:
  const refreshConnection = () => {
    subscription.unsubscribe();
    // Create new subscription...
  };
  
  return () => subscription.unsubscribe();
}, []);
```

### **Manual Refresh**:
- **Soft**: Ctrl+R (preserves some state)
- **Hard**: Ctrl+Shift+R (clears cache)
- **Nuclear**: Close tab, reopen (full reset)

## 📊 **Supabase Dashboard Monitoring**

### **Real-time Inspector**:
1. Go to Supabase Dashboard → Your Project
2. **Settings** → **API**
3. **Realtime** section → **"Realtime Inspector"**
4. Shows live WebSocket connections and events

### **Logs Monitoring**:
1. **Logs** → **Realtime**
2. Filter by connection events
3. See connection/disconnection timestamps
4. Debug subscription errors

## 🐛 **Common Issues & Solutions**

### **Subscription Not Working**:
- ✅ Check ConnectionDebugger status
- ✅ Verify user authentication
- ✅ Look for console errors
- ✅ Try refreshing subscription programmatically

### **Players Not Appearing**:
- ✅ Check player connection indicators
- ✅ Verify game code matches
- ✅ Ensure players joined successfully
- ✅ Check database for player records

### **Buzzer Not Responding**:
- ✅ Verify player connection status (🟢)
- ✅ Check if clue is in correct state
- ✅ Look for JavaScript errors in console
- ✅ Test with single player first

### **Real-time Updates Delayed**:
- ✅ Check network connection quality
- ✅ Monitor subscription count (should be stable)
- ✅ Look for connection status changes
- ✅ Consider increasing timeout values

## 🎯 **Testing Workflow**

### **Basic Multi-Player Test**:
1. **Host Setup**:
   - Incognito window #1
   - Login as host
   - Create game
   - Check ConnectionDebugger shows 🟢

2. **Player Setup**:
   - Incognito window #2
   - Login as player
   - Join game with code
   - Verify player appears in host dashboard with 🟢

3. **Functionality Test**:
   - Host reveals clue
   - Player buzzes
   - Check real-time updates work both ways
   - Monitor connection indicators throughout

### **Stress Test**:
- Open 4-6 incognito windows
- Mix of hosts and players
- Test rapid buzzing
- Monitor ConnectionDebugger for stability

## 📝 **Debug Information Collection**

When reporting issues, include:
- ConnectionDebugger status screenshot
- Player connection indicator states
- Browser console errors
- Supabase Realtime Inspector logs
- Steps to reproduce

## 🚀 **Performance Tips**

- **Limit subscriptions**: Only subscribe to needed channels
- **Clean up**: Always unsubscribe in useEffect cleanup
- **Monitor counts**: Watch subscription count in ConnectionDebugger
- **Use presence**: For player online/offline status
- **Batch updates**: Avoid rapid-fire database writes

---

*This guide helps debug multi-player functionality and real-time connection issues during development.*
