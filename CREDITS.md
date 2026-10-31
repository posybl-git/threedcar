# Credits & Third-Party Licenses

"AURA" is a placeholder brand. The assets below are third-party stand-ins and keep their own licenses.

## 3D model: "Car Concept"

| | |
|---|---|
| Files | `public/models/car.glb` (original, unmodified), plus the derived/compressed `public/models/car.opt.<hash>.glb` |
| Title | Car Concept |
| Author | Eric Chadwick |
| Copyright | © 2024 Darmstadt Graphics Group GmbH |
| License | [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/legalcode) |
| Source | [KhronosGroup/glTF-Sample-Assets, Models/CarConcept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept) |
| Upstream origin | Built from the public-domain (CC0) ["Free Concept Car 004"](https://sketchfab.com/3d-models/free-concept-car-004-public-domain-cc0-4cba124633eb494eadc3bb0c4660ad7e) by Unity Fan |
| Original license file | `assets-src/CarConcept/LICENSE.md`, `assets-src/CarConcept/metadata.json` |

**Attribution requirements (CC BY 4.0):**
- Credit the author and copyright holder, link to the license, and **state that changes were made**.
- The credit must be "reasonable to the medium". For a public website, that means a visible credit line (the site footer) and this file in the repository.
- Suggested footer line:
  > 3D model "Car Concept" by Eric Chadwick, © 2024 Darmstadt Graphics Group GmbH, CC BY 4.0. Modified.

**Trademarks:** the original asset contains the Khronos Group logo and the 3D Commerce logo. These are trademarks of the Khronos Group and are **excluded** from the CC BY license ("This license excludes logos and associated trademarks"). In this project they appear in:
- the licence-plate texture (also used as an emissive map on the rims, brakes, mirrors and hardware materials)
- the tyre sidewall base-colour texture

The derived model used by the site removes or replaces these logos. The original `car.glb` still contains them and is kept only as the unmodified source.

**Changes made (keep this list current):**
- Khronos and 3D Commerce logos removed from the textures (licence plate replaced with a neutral "AURA" plate; logos painted out of the tyre sidewall)
- Geometry and textures compressed for web delivery
- Materials adjusted at runtime (paint colours, glass tint/IOR, rim finishes)

## HDRI: "Studio Small 09"

| | |
|---|---|
| Files | `public/hdri/studio.hdr` (original, 2K, 2048×1024, Radiance RGBE); `public/hdri/studio.soft.<hash>.hdr` (derived: Gaussian pre-filter via `npm run build:hdri`, used by the site) |
| Author | Sergej Majboroda |
| License | [CC0 1.0 Universal (public domain)](https://creativecommons.org/publicdomain/zero/1.0/) |
| Source | [Poly Haven, studio_small_09](https://polyhaven.com/a/studio_small_09) |

**Attribution requirements:** none (CC0). Crediting Poly Haven and the author is appreciated but optional.
