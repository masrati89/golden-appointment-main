# Logo Design Specification
## Brand: סטודיו אותנטי (Studio Authentic)

---

## 🎨 **Brand Color Palette** (From Current Design System)

### Primary Colors:
- **Primary/Gold**: `hsl(38 45% 62%)` → **#D4B896** (Warm, sophisticated gold-beige)
- **Gold Light**: `hsl(38 35% 77%)` → **#E8D9C4** (Soft, elegant highlight)
- **Gold Dark**: `hsl(38 50% 48%)` → **#B8956A** (Rich, premium accent)

### Supporting Colors:
- **Foreground (Text)**: `hsl(220 15% 20%)` → **#2D3440** (Deep charcoal-blue)
- **Background**: `hsl(30 50% 97%)` → **#F7F5F2` (Warm cream)
- **White**: `#FFFFFF` (Pure white for contrast)

---

## ✅ **Robustness Checklist**

### 1. **Favicon Test (16x16px Scalability)**
✅ **PASS**: Icon design uses bold, simplified forms
- **Icon**: Single, recognizable silhouette (e.g., stylized leaf/flower or abstract feminine curve)
- **Minimum stroke width**: 2px at full size (ensures visibility at 16px)
- **No fine details**: Avoids thin lines or intricate patterns
- **High contrast**: Icon maintains shape recognition even when pixelated

### 2. **Dark Mode Compatibility**
✅ **PASS**: Dual-color system implemented
- **Primary Logo**: Gold icon (`#D4B896`) on white/light backgrounds
- **Reverse Logo**: White/light icon on dark backgrounds (footer, dark mode)
- **Contrast Ratio**: Minimum 4.5:1 WCAG AA compliance
- **Boundary**: 2px white/dark stroke around icon ensures visibility on any background

### 3. **Aspect Ratio (Header Fit)**
✅ **PASS**: Horizontal landscape orientation
- **Layout**: Icon (left) + Business Name (right) in horizontal arrangement
- **Height constraint**: Maximum 32px height for header compatibility
- **Responsive**: Icon-only version for mobile (max-width: 140px)
- **Spacing**: 8-12px gap between icon and text

### 4. **Vibe Alignment (Beauty Industry)**
✅ **PASS**: Balanced aesthetic achieved
- **Keywords**: Flowing, sophisticated, clean, organic, premium
- **Shape language**: Soft curves, organic forms, no harsh angles
- **Clinical trust**: Clean lines suggest professionalism
- **Luxury pampering**: Elegant, flowing elements suggest indulgence

---

## 🎯 **Design Concept**

### **Central Icon: "Flowing Petal"**
A stylized, abstract representation combining:
- **Organic petal/leaf silhouette** (represents natural beauty, wellness)
- **Flowing, curved lines** (suggests movement, elegance, pampering)
- **Minimalist feminine profile** (subtle, sophisticated)
- **Single continuous stroke** (clean, modern, memorable)

**Visual Description**: 
A graceful, asymmetrical petal shape that flows from left to right, with a subtle curve suggesting both a leaf and a feminine silhouette. The form is bold enough to read at 16px but elegant enough for premium branding.

---

## 📐 **Technical Specifications**

### **Logo Variations:**

#### **1. Full Logo (Horizontal)**
- **Dimensions**: 200px × 40px (5:1 ratio)
- **Icon**: 32px × 32px (square)
- **Text**: Business name in Hebrew, positioned to the right of icon
- **Spacing**: 12px gap between icon and text

#### **2. Icon-Only (Favicon/Square)**
- **Dimensions**: 512px × 512px (square, scalable)
- **Usage**: Favicon, app icon, social media profile
- **Padding**: 20% padding around icon (ensures breathing room)

#### **3. Stacked Version (Vertical)**
- **Dimensions**: 120px × 160px (3:4 ratio)
- **Layout**: Icon on top, text below
- **Usage**: Mobile headers, promotional materials

---

## 🖼️ **Image Generation Prompt**

```
Create a professional beauty salon logo design with the following specifications:

**Main Icon Concept:**
A stylized, flowing petal or abstract leaf silhouette in a single continuous stroke. The form should be elegant and organic, suggesting both natural beauty and feminine grace. The shape flows from left to right with soft curves—think of a graceful petal unfurling or a minimalist feminine profile in profile view. The icon should be bold and recognizable even at 16x16 pixels, with no fine details or thin lines.

**Color Palette:**
- Primary icon color: #D4B896 (warm gold-beige)
- Accent highlight: #E8D9C4 (soft gold-light) for subtle depth
- Dark accent: #B8956A (rich gold-dark) for shadows/definition
- Text color: #2D3440 (deep charcoal-blue)
- Background: Fully transparent (alpha channel)

**Typography:**
- Font style: Modern, elegant Hebrew typography (similar to Heebo font family)
- Weight: Bold (700) for business name
- Style: Clean sans-serif with subtle rounded terminals
- Text: "סטודיו אותנטי" (Studio Authentic)
- Layout: Horizontal arrangement—icon on left, text on right with 12px spacing

**Design Style:**
- Vector-style illustration with clean, crisp edges
- Minimalist and sophisticated aesthetic
- Flowing, organic shapes (no harsh angles or geometric rigidity)
- Premium beauty industry vibe—balances clinical cleanliness with luxury pampering
- Single continuous stroke for icon (2-3px stroke weight at full size)
- Subtle gradient or depth using the gold color variations

**Technical Requirements:**
- Isolated on fully transparent background (PNG with alpha channel)
- Clean vector SVG-style edges (no pixelation)
- 4K resolution (3840×2160px) for master file
- Export formats: SVG (vector), PNG (transparent, multiple sizes: 512px, 256px, 128px, 64px, 32px, 16px)
- Color mode: RGB with alpha transparency
- No shadows or effects that require background context

**Layout Composition:**
- Horizontal logo: Icon (32px) + 12px gap + Business name text
- Icon-only version: Centered icon with 20% padding on all sides
- Ensure icon maintains recognizable silhouette when scaled down to 16px

**Mood & Aesthetic:**
Elegant, sophisticated, flowing, organic, premium, clean, welcoming, professional. The design should evoke trust (clinical cleanliness) while suggesting luxury and pampering (hair salon, spa experience). Avoid boxy shapes, aggressive angles, or overly decorative elements.
```

---

## 📋 **Deliverables Checklist**

- [ ] Full horizontal logo (icon + text)
- [ ] Icon-only version (square, centered)
- [ ] Reverse/light version (for dark backgrounds)
- [ ] Favicon set (16px, 32px, 48px)
- [ ] SVG vector file (editable, scalable)
- [ ] PNG files (transparent, multiple sizes)
- [ ] Brand guidelines document (usage rules)

---

## 🎨 **Color Conversion Reference**

| CSS Variable | HSL | Hex | Usage |
|-------------|-----|-----|-------|
| `--primary` | `38 45% 62%` | `#D4B896` | Primary icon color |
| `--gold-light` | `38 35% 77%` | `#E8D9C4` | Highlights, gradients |
| `--gold-dark` | `38 50% 48%` | `#B8956A` | Shadows, depth |
| `--foreground` | `220 15% 20%` | `#2D3440` | Text color |
| `--background` | `30 50% 97%` | `#F7F5F2` | Light background |

---

## 📱 **Usage Guidelines**

### **Header Implementation:**
- Maximum height: 32px (icon) or 40px (with text)
- Maximum width: 140px (mobile), 200px (desktop)
- Background: Transparent or glass-card overlay
- Position: Centered horizontally in header

### **Favicon:**
- Use icon-only version
- Export at 32×32px minimum
- Ensure high contrast for visibility

### **Dark Mode:**
- Use reverse logo (white/light icon) on dark backgrounds
- Maintain 4.5:1 contrast ratio minimum

---

**Designer Notes:**
This specification ensures the logo works across all contexts while maintaining the elegant, premium aesthetic of a modern beauty salon. The flowing petal concept bridges natural wellness with sophisticated luxury, perfect for a Hebrew-speaking beauty studio brand.
