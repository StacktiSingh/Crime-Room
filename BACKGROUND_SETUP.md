# 🎨 Background Image Setup

## How to Add Your Custom Background Image

### Step 1: Upload Your Image
1. Place your background image in the `static/images/` folder
2. Name it exactly: `background.jpg` or `background.png`

### Step 2: Supported Formats
- **JPG/JPEG** - Recommended for photos
- **PNG** - Recommended for graphics with transparency
- **WebP** - Modern format for better compression

### Step 3: Image Recommendations
- **Resolution**: 1920x1080 or higher for best quality
- **File Size**: Keep under 2MB for faster loading
- **Style**: Dark or muted images work best with the UI

### Step 4: Where the Image is Used
The background image is referenced in `static/css/style.css` at line 25:
```css
background-image: 
  radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
  radial-gradient(circle at 80% 20%, rgba(255, 107, 157, 0.3) 0%, transparent 50%),
  radial-gradient(circle at 40% 40%, rgba(78, 205, 196, 0.3) 0%, transparent 50%),
  url('../images/background.jpg'); /* <-- Your image goes here */
```

### Step 5: Custom Image Name (Optional)
If you want to use a different filename, change `background.jpg` to your filename in the CSS file above.

### Example File Structure:
```
static/
├── css/
│   └── style.css
├── images/
│   └── background.jpg  <-- Your image here
└── js/
    └── webrtc.js
```

## 🎨 Current Design Features

### Color Palette
- **Primary**: Deep space blue (#0f0f23)
- **Secondary**: Cosmic purple (#1a1a2e) 
- **Accent**: Bright pink (#ff6b9d)
- **Success**: Mint green (#96ceb4)
- **Warning**: Golden yellow (#feca57)

### Visual Effects
- **Glass Morphism**: Translucent panels with blur effects
- **Gradient Overlays**: Colorful radial gradients over your background
- **Smooth Animations**: Fade-ins, slides, and hover effects
- **Modern Typography**: Inter font family for clean readability

### UI Improvements Added
✅ Glass morphism design  
✅ Beautiful gradient buttons  
✅ Enhanced chat messages with avatars  
✅ Animated notifications  
✅ Professional video call interface  
✅ Responsive design for mobile  
✅ Custom scrollbars  
✅ Hover animations  
✅ Status indicators with pulse effects  

Your background image will blend seamlessly with these colorful overlays to create a stunning visual experience!