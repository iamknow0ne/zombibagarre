# 🎨 AAA Graphics Assets - Download Instructions

Your game now has AAA graphics! To complete the visual overhaul, download these **FREE** assets:

---

## 📦 1. ZOMBIE 3D MODELS (Quaternius - CC0 License)

**Download:** https://quaternius.com/packs/ultimatemodularmen.html
**Alternative:** https://sketchfab.com/3d-models/zombie-apocalypse-kit-free-b0806eaea83f49a592f7e9a039f7c385

### What to Download:
- **Ultimate Modular Men Pack** (includes zombies, soldiers, civilians)
- Format: **GLTF/GLB** (best for THREE.js)
- License: **CC0** (completely free, even for commercial use)

### Installation:
1. Download the pack
2. Extract the zombie models
3. Copy to: `/public/assets/models/zombies/`
4. Your files should look like:
   ```
   /public/assets/models/zombies/
   ├── zombie_normal.glb
   ├── zombie_fast.glb
   ├── zombie_tank.glb
   └── zombie_boss.glb
   ```

---

## 🌆 2. HDR ENVIRONMENT MAPS (Polyhaven - CC0 License)

**Download:** https://polyhaven.com/hdris/urban

### Recommended HDRIs:
1. **Urban Street** (destroyed city vibe)
   - https://polyhaven.com/a/urban_street_01
   - Resolution: **4K** (2048px recommended for performance)
   - Format: **.hdr** or **.exr**

2. **Apocalyptic Alternatives:**
   - https://polyhaven.com/a/industrial_sunset_02 (industrial)
   - https://polyhaven.com/a/shanghai_bund (urban night)
   - https://polyhaven.com/a/abandoned_parking (abandoned)

### Installation:
1. Download your chosen HDRI in **.hdr** format
2. Rename to `urban_street.hdr`
3. Copy to: `/public/assets/hdri/`
4. The game will automatically load it!

---

## 🚗 3. VEHICLE MODELS (Optional - Quaternius)

**Download:** https://quaternius.com/packs/lowpolycars.html

### Installation:
Copy to: `/public/assets/models/vehicles/`

---

## 🏗️ 4. BUILDING TEXTURES (Optional - Polyhaven)

**Download:** https://polyhaven.com/textures

### Recommended Textures:
- **Damaged Concrete:** https://polyhaven.com/a/concrete_damaged_01
- **Rusty Metal:** https://polyhaven.com/a/rusty_metal_02
- **Asphalt:** https://polyhaven.com/a/asphalt_02

### Installation:
Copy to: `/public/assets/textures/`

---

## 📁 Final Folder Structure

```
/public/assets/
├── hdri/
│   └── urban_street.hdr          ← HDR environment map
├── models/
│   ├── zombies/
│   │   ├── zombie_normal.glb     ← 3D zombie models
│   │   ├── zombie_fast.glb
│   │   ├── zombie_tank.glb
│   │   └── zombie_boss.glb
│   └── vehicles/
│       └── (optional vehicle models)
└── textures/
    └── (optional building textures)
```

---

## ✅ Quick Start (Minimal Setup)

**Just want to get started fast?** Only download these:

1. **ONE HDRI**: `urban_street.hdr` from Polyhaven → `/public/assets/hdri/`
2. **ONE Zombie Model**: Any zombie GLB → `/public/assets/models/zombies/zombie_normal.glb`

The game will work with fallbacks for missing assets!

---

## 🎮 Testing Your Setup

1. Create the asset folders
2. Download at least one HDRI
3. Restart the game (`npm run dev`)
4. Look for console messages:
   - ✅ `HDR environment loaded`
   - ✅ `AAA Urban Apocalypse Map loaded!`

---

## 🆘 Troubleshooting

**"HDR environment not found"**
- Check file path: `/public/assets/hdri/urban_street.hdr`
- Check file format: Must be `.hdr` or `.exr`
- Game will use fallback procedural sky (still looks good!)

**"Models not loading"**
- Check file format: Must be `.glb` or `.gltf`
- Check file path matches code

---

## 📖 Resources

- **Polyhaven (HDRIs & Textures):** https://polyhaven.com
- **Quaternius (3D Models):** https://quaternius.com
- **Sketchfab (Alternative Models):** https://sketchfab.com/search?q=zombie&type=models
- **THREE.js GLTF Guide:** https://threejs.org/docs/#examples/en/loaders/GLTFLoader

---

**All assets listed are CC0 (Public Domain) - completely free for any use!** 🎉
