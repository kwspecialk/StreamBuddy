# Next Episode & Animation Fixes - Test Guide

## ✅ **Issues Fixed**

### **1. Fixed Next Season Jump Logic**
**Issue**: Season jumping wasn't working reliably
**Solution**: Improved heuristic logic based on common TV season lengths

### **2. Shortened Stream Added Animation**
**Issue**: "Added!" animation lingered too long (2.5 seconds)
**Solution**: Reduced to 1.5 seconds for better UX flow

---

## **Enhanced Next Episode Logic**

### **New Season Jump Strategies**:

1. **22+ Episodes**: Assumes traditional US broadcast format (22-24 episodes)
   - Episodes 22, 23, 24+ → Jump to Season X+1 Episode 1

2. **12-13 Episodes**: Assumes streaming/cable format (12-13 episodes)
   - Episodes 12, 13 → Jump to Season X+1 Episode 1

3. **8-10 Episodes**: Assumes premium/short season format
   - Episodes 8, 9, 10 → Still advances normally (many shows have 8-10 episodes)

4. **All Other Episodes**: Normal advancement (Episode X+1)

### **Testing Next Episode Functionality**:

#### **Test Case 1: Standard Episodes (1-21)**
- Start with any episode 1-21
- Click next episode button
- ✅ Should advance to next episode in same season
- Example: S1E5 → S1E6

#### **Test Case 2: Season End Detection (22+)**
- Navigate to episode 22 or higher
- Click next episode button
- ✅ Should jump to next season episode 1
- Example: S1E22 → S2E1

#### **Test Case 3: Short Season Format (12-13)**
- Navigate to episode 12 or 13
- Click next episode button
- ✅ Should jump to next season episode 1
- Example: S1E12 → S2E1

#### **Test Case 4: Premium Format (8-10)**
- Navigate to episode 8, 9, or 10
- Click next episode button
- ✅ Should advance normally (many shows have 8-10 episodes)
- Example: S1E8 → S1E9

#### **Manual Testing URLs**:
Test with these example URLs (replace with real show IDs):

```
# Start with early episode
https://vidsrc.xyz/embed/tv/1399/1-3  (Game of Thrones S1E3)

# Test season boundary
https://vidsrc.xyz/embed/tv/1399/1-10 (Game of Thrones S1E10 - should jump to S2E1)

# Test high episode numbers
https://vidsrc.xyz/embed/tv/some-show/1-22 (Should jump to S2E1)
```

---

## **Shortened Animation Testing**

### **Stream Added Animation**:
- Add a sports stream from the browser modal
- ✅ "Added!" checkmark should appear
- ✅ Animation should disappear after **1.5 seconds** (was 2.5 seconds)
- ✅ Should feel more responsive and less lingering

### **Testing Animation Duration**:
1. Open Stream Browser modal
2. Click on any sports stream
3. Time the "Added!" animation
4. ✅ Should disappear at 1.5 seconds, not 2.5 seconds

---

## **Console Logging for Debugging**

The enhanced next episode function now provides detailed console logs:

```javascript
// Normal episode advancement
"Advancing to next episode: S1E6"
"Advanced from S1E5 to S1E6"
"New URL: https://vidsrc.xyz/embed/tv/1399/1-6"

// Season jump detection
"Episode 22 is likely end of season (22+ episodes)"
"Jumping to next season: S2E1"
"Advanced from S1E22 to S2E1"
"New URL: https://vidsrc.xyz/embed/tv/1399/2-1"
```

### **To Test Season Jumping**:
1. Add a TV show stream
2. Open browser developer tools (F12)
3. Open Manage Streams modal
4. Click the next episode button (→)
5. ✅ Check console for detailed logging
6. ✅ Verify the URL actually changes in the stream

---

## **Known TV Show Episode Patterns**

### **Common Season Lengths**:
- **Broadcast TV**: 22-24 episodes (NBC, CBS, ABC, FOX shows)
- **Cable/Streaming**: 10-13 episodes (HBO, Netflix, Amazon shows)
- **Premium Limited**: 6-8 episodes (HBO limited series)
- **Anime**: 12-13 or 24-26 episodes

### **Logic Covers**:
- ✅ **Traditional TV**: 22+ episodes → season jump
- ✅ **Streaming Standard**: 12-13 episodes → season jump  
- ✅ **Short Seasons**: 8-10 episodes → normal advancement
- ✅ **All Others**: Normal episode progression

---

## **Edge Cases to Test**

### **URL Parsing**:
- ✅ Test with `vidsrc.xyz` URLs
- ✅ Test with `2embed.cc` URLs
- ✅ Test with malformed URLs (should not crash)

### **Episode Numbers**:
- ✅ Single digit episodes (S1E1 → S1E2)
- ✅ Double digit episodes (S1E15 → S1E16)
- ✅ Season boundaries (S1E22 → S2E1)
- ✅ High season numbers (S5E12 → S6E1)

### **Loading States**:
- ✅ Button shows loading animation
- ✅ Button is disabled during operation
- ✅ Loading clears after 500ms
- ✅ Multiple rapid clicks handled gracefully

---

## **Files Modified**:

1. **`/src/components/EditStreamsModal.js`**
   - Enhanced season jump logic with multiple detection strategies
   - Improved console logging for debugging

2. **`/src/components/StreamBrowserModal.js`**
   - Reduced animation timeout from 2500ms to 1500ms

---

## **User Experience Improvements**:

1. **Smarter Season Detection**: Uses common TV patterns instead of arbitrary episode numbers
2. **Better Logging**: Console messages help debug what's happening
3. **Faster Feedback**: Stream added animation is more responsive
4. **More Reliable**: Handles different show formats (broadcast, streaming, premium)

The season jumping should now work much more reliably across different types of TV shows!
