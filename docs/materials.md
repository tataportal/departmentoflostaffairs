# Room materials

Locally hosted PBR textures from Poly Haven (CC0). No runtime API dependency.
Powered by Poly Haven: https://polyhaven.com/

- Timber: https://polyhaven.com/a/wood_table_001
- Upholstery: https://polyhaven.com/a/rough_linen
- Clay wall finish: https://polyhaven.com/a/clay_plaster

Diffuse maps: 2K JPG, sRGB. OpenGL normals and roughness: 1K JPG, linear.
Linen dye is neutralized in the material shader, then tinted warm ivory.
Normal strength is reduced to fit the miniature scene's metre scale.
Per-piece timber UV offsets reduce repeated grain without extra draw calls.
Tatami, paper and ceramics retain the existing atlas; tatami UV scale adjusted.

## Original atlas provenance

Retained for tatami, paper and ceramic. The following records the original atlas generation, before the PBR replacements above.



Use case: product-mockup. Asset type: PBR albedo material texture atlas for a real-time 3D Japanese living room. Generate one SQUARE 2048x2048 image with exactly FOUR equally sized square quadrants, no borders or gutters. Each quadrant is a flat, orthographic, fully in-focus macro material scan, with uniform diffuse neutral illumination, no directional lighting, no cast shadows, no perspective, no objects, no labels, no seams inside each material, no text. TOP LEFT: natural oiled Japanese chestnut wood with long organic flowing grain vertically oriented, warm medium brown, visible annual rings, subtle open pores, beautifully restrained natural knots, NOT planks, NOT dark espresso; this is a close scan of one uninterrupted wood surface. TOP RIGHT: beautiful natural flax linen upholstery, individual slightly irregular thick woven warp and weft threads, soft warm ivory with oatmeal fibers, dense plain weave, true tangible fiber detail, no folds, no buttons. BOTTOM LEFT: authentic Japanese igusa tatami reed mat, finely bundled parallel horizontal straw reeds with characteristic short alternating binding stitches, muted olive-gold straw, dense regular construction with slight handcrafted variation, no edge border. BOTTOM RIGHT: Japanese lime clay plaster, warm pale gray mineral finish, broad extremely subtle overlapping trowel clouds and fine mineral pores, restrained wabi sabi irregularity, no cracks, not stone, not dirty. Professional high resolution physically based game material textures, microdetail integrated with medium scale variation, NOT a stylized painting, NOT photorealistic room, NOT a sample arrangement photographed in perspective. The four texture images must fill their quadrant completely, edge to edge. Avoid high contrast mottling or baked specular highlights. Used on a tactile handcrafted 3D diorama inspired by Japanese animated-film backgrounds.
