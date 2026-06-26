// Hand-mapped county for refuges the automated point-in-polygon (UNIT_COUNTY)
// left county-less — almost all are coastal island/rock/estuary refuges whose
// centroid fell in open water, plus a few remote territorial units. Resolved by
// NEAREST US county (offline, vs the county GeoJSON). These ids are NOT in
// UNIT_COUNTY, so this never conflicts with it; it lets each unit seed the
// adjacent county's bird + non-bird floor instead of relying on live calls only.
// Most map to counties that already have a full floor; Nantucket (US-MA-019) was
// built for this. Regenerate with scripts (nearest-county resolver) if the
// refuge list changes.
export const UNIT_COUNTY_EXTRA = {
  'nwr_anclote':          'US-FL-101', // Pasco, FL
  'nwr_buck-island':      'US-PR-049', // Culebra, PR
  'nwr_cape-romain':      'US-SC-019', // Charleston, SC
  'nwr_castle-rock':      'US-CA-015', // Del Norte, CA
  'nwr_cedar-keys':       'US-FL-075', // Levy, FL
  'nwr_chamisso':         'US-AK-188', // Northwest Arctic, AK
  'nwr_chassahowitzka':   'US-FL-017', // Citrus, FL
  'nwr_copalis':          'US-WA-027', // Grays Harbor, WA
  'nwr_egmont-key':       'US-FL-081', // Manatee, FL
  'nwr_fisherman-island': 'US-VA-131', // Northampton, VA
  'nwr_flattery-rocks':   'US-WA-009', // Clallam, WA
  'nwr_franklin-island':  'US-ME-015', // Lincoln, ME
  'nwr_gravel-island':    'US-WI-029', // Door, WI
  'nwr_great-white-heron':'US-FL-087', // Monroe, FL
  'nwr_green-bay':        'US-WI-029', // Door, WI
  'nwr_green-cay':        'US-PR-147', // Vieques area, PR
  'nwr_hawaiian-islands': 'US-HI-007', // Kauai, HI (NW Hawaiian Is.)
  'nwr_huron':            'US-MI-013', // Baraga, MI
  'nwr_island-bay':       'US-FL-015', // Charlotte, FL
  'nwr_k-lauea-point':    'US-HI-007', // Kauai, HI
  'nwr_lewis-and-clark':  'US-OR-007', // Clatsop, OR (Columbia estuary)
  'nwr_marin-islands':    'US-CA-075', // (San Francisco/Marin), CA
  'nwr_michigan-islands': 'US-MI-153', // Wexford-area, MI
  'nwr_midway-atoll':     'US-HI-007', // Kauai, HI (nearest US county)
  'nwr_nantucket':        'US-MA-019', // Nantucket, MA (floor built for this)
  'nwr_navassa-island':   'US-PR-097', // Mayagüez, PR (nearest US county)
  'nwr_nomans-land-island':'US-MA-007',// Dukes, MA
  'nwr_oregon-islands':   'US-OR-041', // Lincoln, OR
  'nwr_passage-key':      'US-FL-081', // Manatee, FL
  'nwr_pea-island':       'US-NC-055', // Dare, NC
  'nwr_pine-island':      'US-FL-071', // Lee, FL
  'nwr_pinellas':         'US-FL-081', // Manatee/Pinellas, FL
  'nwr_pond-island':      'US-ME-023', // Sagadahoc, ME
  'nwr_protection-island':'US-WA-031', // Jefferson, WA
  'nwr_quillayute-needles':'US-WA-009',// Clallam, WA
  'nwr_san-juan-islands': 'US-WA-055', // San Juan, WA
  'nwr_san-pablo-bay':    'US-CA-041', // Marin, CA
  'nwr_sandy-point':      'US-PR-147', // Vieques area, PR
  'nwr_seal-island':      'US-ME-013', // Knox, ME
  'nwr_shell-keys':       'US-LA-045', // Iberia, LA
  'nwr_stewart-b-mckinney':'US-CT-009',// New Haven, CT
  'nwr_susquehanna':      'US-MD-025', // Harford, MD
  'nwr_thacher-island':   'US-MA-009', // Essex, MA
  'nwr_three-arch-rocks': 'US-OR-057', // Yamhill-area, OR
  'nwr_west-sister-island':'US-OH-123',// Ottawa, OH (Lake Erie)
};
