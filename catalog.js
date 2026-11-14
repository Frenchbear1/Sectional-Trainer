(() => {
'use strict';
const officialVfr = 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/';
const officialTpp = 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dtpp/';
const abeDiagram = 'https://aeronav.faa.gov/d-tpp/2611/00015ad.pdf';
const abeApproach = 'https://aeronav.faa.gov/d-tpp/2611/00015il6.pdf';
const nyChart = 'https://aeronav.faa.gov/visual/10-29-2026/PDFs/New_York.pdf';
const nyTac = 'https://aeronav.faa.gov/visual/10-29-2026/PDFs/New_York_TAC.pdf';
const nyHeli = 'https://aeronav.faa.gov/visual/10-29-2026/PDFs/New_York_Heli.pdf';
const location = (name, lat, lon, zoom=12, note='', layer='sectional', url='') =>
  ({name,lat,lon,zoom,note,layer,url,kind:'Regional chart view'});
const point = (...args) => ({...location(...args),kind:'Location on chart'});
const page = (name,url,note='') => ({name,url,note});
const sample = (name,url,note) => ({name,url,note,kind:'FAA chart PDF'});
const abe = point('Lehigh Valley International (KABE)',40.65236,-75.44040,12,'Use the airport reference point and read the surrounding chart text.', 'sectional',nyChart);
const abeC = location('Allentown Class C area',40.65236,-75.44040,11,'The circle marks KABE. Look around the airport for the different shelf floors and the cutout toward Queen City.', 'sectional',nyChart);
const mdt = location('Harrisburg International (KMDT)',40.19349,-76.76340,11,'Look around Harrisburg for the TRSA linework and sector labels.');
const phl = location('Philadelphia Class B area',39.87208,-75.24067,11,'Look around Philadelphia for the blue shelf boundaries and printed floor and ceiling pairs.');
const jfk = location('New York Terminal Area Chart',40.6413,-73.7781,11,'The airport anchors the view. Pan across the shelves to read the blue boundary markings.','tac',nyTac);
const xll = point('Queen City Airport (KXLL)',40.57028,-75.48833,12,'Compare Queen City with nearby Lehigh Valley International.', 'sectional',nyChart);
const hudson = location('Hudson River, New York TAC',40.7527,-74.0099,12,'Follow the river and consult the chart notes for the Hudson River Exclusion. The marker is a regional anchor.','tac',nyTac);
const dc = location('Washington, DC area',38.856,-77.041,10,'Use the wider Washington chart to find the SFRA and FRZ labels and boundaries.');
const rivers = location('Delaware–Lehigh confluence, Easton',40.6892,-75.2041,12,'Use the rivers at Easton as recognizable chart landmarks.', 'sectional',nyChart);
const anchorage = location('Anchorage area, Alaska',61.17,-150.05,10);
const terrain = location('Mount Rainier, Washington',46.8523,-121.7603,12,'Compare the printed elevation and the surrounding contours and terrain shading.');
const niagara = location('Niagara River, New York–Ontario',43.079,-79.075,12,'Follow the chart boundary along the river.');
const salt = location('Bonneville Salt Flats area, Utah',40.76,-113.86,11,'Use this view to look for dry-lake and salt-flat depictions in the surrounding area.');
const delMar = location('Delaware and Maryland coast',38.4,-75.0,10,'Look for differences between the Atlantic shoreline, bays and inland water.');
const cuba = page('FAA Caribbean VFR charts',officialVfr+'#caribbean','Open the current Caribbean chart from the FAA list.');
const nyHelicopter = page('New York Helicopter Route Chart',nyHeli,'Use the route chart and its adjoining route descriptions.');
const nyTerminalPdf = page('New York TAC and accompanying material',nyTac,'Find the route depiction and accompanying notes in the chart PDF.');
const chartProducts = page('FAA VFR chart downloads',officialVfr,'Open the applicable chart from the FAA list.');
const plateProducts = page('FAA terminal procedures search',officialTpp,'Search by airport and open the appropriate approach plate, departure, arrival, or airport diagram.');
window.CHART_EXAMPLES = {
  abe:[abe], classC:[abeC], classB:[phl,jfk], tacB:[jfk], xll:[xll], trsa:[mdt],
  hudson:[hudson], dc:[dc], rivers:[rivers], anchorage:[anchorage], terrain:[terrain],
  niagara:[niagara], salt:[salt], coast:[delMar], caribbean:[cuba], heli:[nyHelicopter],
  fly:[nyTerminalPdf], downloads:[chartProducts], plate:[plateProducts],
  classD:[location('Reading Regional Airport (KRDG)',40.3785,-75.9652,12,'Look around Reading for the dashed Class D boundary.', 'sectional',nyChart),
          location('Trenton Mercer Airport (KTTN)',40.2767,-74.8135,12)],
  e700:[location('Northeastern Pennsylvania',41.14,-75.38,10,'Look for a magenta band with a sharp edge and a feathered side. This is a regional view.')],
  moa:[location('Pine Barrens area, New Jersey',39.74,-74.45,10,'Look for the Warren Grove MOA boundary and labels in the wider area.')],
  restricted:[location('Warren Grove Range area, New Jersey',39.70,-74.40,11,'Look for the R-5002 labels in the surrounding area. The circle serves as a regional anchor.')],
  prohibited:[location('Central Washington, DC',38.8977,-77.0365,12,'Look for the P-56 complexes. Their printed labels can be displaced on a sectional.','tac')],
  fixLow:[location('Lehigh Valley, IFR Enroute Low',40.65236,-75.44040,11,'Read the route and fix symbols around the Lehigh Valley.','low')],
  ifrHigh:[location('New York-area IFR Enroute High',40.71,-74.0,9,'Read the high-altitude route markings in the wider area.','high')],
  mountains:[location('Continental Divide, Colorado',39.70,-105.88,11,'Look around the high terrain for named passes and spot elevations.')],
  vegas:[location('Las Vegas Class B area',36.08,-115.15,11,'Compare the sectional with the terminal chart for the same airspace.', 'tac')],
  greenwood:[point('Greenwood Lake Airport (4N1)',41.1284,-74.3467,12,'Look for the airport symbol and its chart data group.', 'sectional',nyChart)],
  dam:[point('Hoover Dam, Nevada–Arizona',36.0156,-114.7378,12,'The marker locates the dam. Compare its chart depiction with the shoreline and roads.')],
  tfr:[page('FAA Special Use Airspace viewer','https://sua.faa.gov/','The FAA viewer shows separately published schedule and TFR information.')],
  kabeDiagram:[sample('Lehigh Valley airport diagram',abeDiagram,'Open the FAA diagram from the October 29, 2026 cycle.')],
  kabeApproach:[sample('KABE ILS or LOC RWY 06',abeApproach,'Open the FAA plate from the October 29, 2026 cycle.')],
  lake:[location('Lake Michigan at Chicago',41.91,-87.53,10,'Compare the open-water tone with inland lakes and reservoirs.')],
  delBay:[location('Delaware Bay and lower river',39.23,-75.22,10,'Use as a regional view for shoreline, tidewater and estuary markings.')],
  alaskaGlacier:[location('Matanuska Glacier area, Alaska',61.74,-147.70,11,'Compare glacier and terrain markings in the upper valley.')],
  sf:[location('San Francisco Bay area',37.78,-122.43,11,'Look at the charted bay crossings and nearby shoreline or terrain marks.')],
  grand:[page('FAA Grand Canyon VFR chart',officialVfr,'Select Grand Canyon on the FAA downloads page to see the specialized chart.')],
  chartGuide:[page('FAA Chart Users’ Guide','https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/aero_guide/')]
};

function group(id,label,section,items) {
  return {id,label,section,rows:items.trim().split('\n').map(row=>row.trim()).filter(Boolean)};
}
window.CHART_INDEX = [
group('sec-airports','VFR · Airports & navaids','Sectional/TAC · Airports and navaids',`
Lehigh Valley International|KABE ABE Allentown airport|Local airport example.|abe
Queen City Airport|KXLL XLL Allentown|Local non-towered airport example.|xll
Greenwood Lake Airport|4N1|Airport and chart data group.|greenwood
Towered civil landplane airport|blue airport control tower|Look for the blue airport depiction.|abe
Non-towered civil landplane airport|magenta airport uncontrolled airport|Look for the magenta airport depiction.|xll
Civil-military airport with tower|joint use towered
Civil-military airport without tower|joint use non towered
Military airport with tower|blue military landplane
Military airport without tower|magenta military landplane
Airport runway pattern|hard surfaced paved runway airport shape|Look for the diagram of the airport runways.|abe
Soft-surface public-use airport|grass turf unpaved short paved runway
Public-use airport with fuel|fuel tick marks available
Public-use airport without fuel|no fuel without services
Restricted or private airport|Pvt private-use soft-surface
Airport of landmark value|closed recognizable runway visual landmark
Abandoned airport|closed abandoned runway
Closed hard-surfaced runway annotation|closed label runway
Ultralight flight park|ultralight landing facility
Towered heliport|H with tower
Non-towered heliport|H helipad
Unverified landing area|unverified airport field
Objectionable airport|objectionable annotation
Foreign airport outside the U.S. FIR|foreign airport note ICAO ID||niagara
Foreign airport note|foreign airfield annotation
Seaplane base without fuel|water airport anchor
Seaplane base with fuel|water airport services anchor
Seaplane facility with runway and waterway|combined land water
Towered seaplane base|water airport tower
Non-towered seaplane base|water airport no tower
Airport data grouping|airport information name numbers frequency label text||abe
Boxed airport name|special traffic rule part 93
Airport elevation|field elevation in feet airport data||abe
Longest runway length notation|hundreds of feet runway length||abe
Control tower primary frequency|CT frequency||abe
Part-time control tower asterisk|tower star frequency hours
Common Traffic Advisory Frequency|CTAF circle C|Find the frequency and its CTAF notation.|xll
UNICOM frequency|unicom advisory||xll
ATIS frequency|automatic terminal information service||abe
Automatic Flight Information Service|AFIS
AWOS and ASOS airport weather|automated weather station airport data
VFR advisory frequency|VFR advisory service
Right traffic pattern|RP right pattern runways
Runway lighting notation|L sunset sunrise lighting
Limited runway lighting|star L lighting limitations chart supplement
Missing chart data dash|missing data hyphen airport
Chart Supplement cross-reference|airport data see supplement
On-field Flight Service Station|FSS airport
Airport of entry|AOE customs
Fixed-wing special VFR prohibition|no SVFR FAR 91
Weather camera notation|Alaska weather camera VFR cam||anchorage
VOR|VHF omnidirectional radio range hexagon
VOR/DME|VORDME paired range
VORTAC|VOR TACAN
TACAN used to define Class B|TAC navaid
Standalone DME|distance measuring equipment
DME collocated at an airport|distance measuring equipment on field
VOR collocated at an airport|VOR on field
Nondirectional beacon|NDB LF MF
NDB/DME|NDBDME paired
ILS component|localizer
ILS/DME component|ILSDME
Navaid used to define Class B airspace|navaid radial distance
Navaid compass rose|magnetic orientation
Standalone compass rosette|isolated magnetic rose
Navaid identification and frequency box|frequency ident morse channel
Navaid Morse identifier|Morse dots dashes station
Navaid voice unavailable underline|underlined frequency
Navaid part-time or on request|operates less than continuous
Navaid shutdown crosshatch|shutdown status
Collocated NDB and VOR frequency box|shared ident paired
Off-airport AWOS or ASOS|weather broadcast
VHF/UHF automated weather service|weather frequency VHF UHF
LF/MF automated weather service|weather frequency LF MF
Broadcast station|BS radio AM
Remote communications outlet|RCO remote outlet
Flight Service Station heavy box|FSS voice communications
Remoted Flight Service frequencies|thin box frequencies above
No Flight Service frequency available|thin box without frequencies
`),
group('sec-airspace','VFR · Airspace & routes','Sectional/TAC · Airspace and routes',`
Class B airspace|bravo blue solid shelves shelf floors||classB
Class B on a Terminal Area Chart|TAC bravo boundary||tacB
Class B shelf floor and ceiling|blue fraction altitude numerator denominator||classB
Class B floor with plus sign|upward and above
Class B surface area|SFC surface shelf||classB
Class B defining navaid radial|radial from facility
Class B defining navaid distance|distance from facility nautical miles
Class C airspace|charlie magenta solid shelf floors different shelves|Compare the magenta rings and the printed floor and ceiling pairs.|classC
Class C cutout or exclusion|queen city KABE cutout||classC
Class C floor and ceiling label|magenta fraction altitude numerator denominator||classC
Class D airspace|delta dashed blue dotted blue airport circle||classD
Class D ceiling in a dashed box|blue squared altitude||classD
Class D ceiling with minus sign|excluding ceiling minus
Class D ceiling marked T|ceiling below overlying class B
Class D part-time note|see notams supplement part-time
Class E surface boundary|dashed magenta dotted magenta E SFC
Class E surface extension|dashed magenta extension E4
Class E surface exclusion|surface area cutout
Class E 700-foot transition area|magenta vignette fuzzy pink 700 agl||e700
Class E 700-foot floor next to Class G|magenta vignette uncontrolled
Class E 1,200-foot floor next to Class G|blue fuzzy line blue vignette 1200 agl
Class E floor above 1,200 feet|higher floor altitudes
Class E floor change screened line|shaded floor boundary other than vignette
Class E ceiling annotation|ceiling below 18000 MSL AGL
Class E part-time note|see notams supplement 700
Class G label|uncontrolled airspace tag
Victor airway centerline|V airway class E low altitude VOR
Victor airway number|V route numeric blue
Victor airway radial notation|airway radials blue
LF/MF colored airway|federal airway magenta green red amber blue
Combined colored airway and T-route|RNAV 2 T routes screened magenta
Offshore control area|OCA offshore outline
Additional offshore control area|AOCA offshore
Oceanic control area|OCA oceanic
Flight Information Region boundary|FIR blue ticks
Control Area boundary|CTA
Coincident CTA/FIR boundary|FIR CTA line
Adjoining FIR boundaries|alternating ticks
Foreign airspace note|notice foreign FIR
Air Defense Identification Zone|ADIZ dotted defense boundary CADIZ
Special conservation area|blue stippled wilderness refuge national park
NOAA marine sanctuary designated area|marine sanctuary near coast
National security Special Flight Rules Area|SFRA Washington DC||dc
Special Flight Rules Area|SFRA Hudson exclusion||hudson
Flight Restricted Zone|FRZ DC||dc
National Security Area|NSA avoid request notice
National-security TFR chart depiction|permanent TFR chart note
National defense airspace TFR area|charted TFR height note
Sporting event TFR site|stadium symbol
Special use airspace label for a small area|small SUA abbreviated
Prohibited area|P-56 SUA blue hatched boundary||prohibited
Restricted area|R-5002 SUA blue hatched boundary||restricted
Warning area|W SUA offshore
Military operations area|MOA magenta hatched boundary||moa
Alert area|A SUA magenta
Controlled firing area|CFA SUA|The guide and FAA sources explain charting treatment. Use the chart guide for the depiction context.
Special awareness training area|SATA special awareness
Mode C veil|mode c ADS B veil
Part 93 special air traffic rules boundary|crosshatching traffic pattern||hudson
High-energy radiation area|HERA
Military training route visual|MTR VR
Military training route instrument|MTR IR
MTR three-digit route designator|military route at least one segment above 1500 AGL
MTR four-digit route designator|military route no segment above 1500 AGL
Special military activity route|SMAR military training route box
Space operations area|space FAR 91.143
Space launch activity symbol|rocket launch
Aerobatic practice area|aerobatics
Glider operations area|sailplane
Hang glider activity|hang gliding
Ultralight activity|ultralight operations
Unmanned aircraft activity|UAS UAV drone
Parachute jumping area|parachute skydiving drop zone
Parachute jumping area with frequency|parachute jump frequency
Permanent continuous flight restriction area|special security notice
TAC IFR arrival route|arrival arrow
TAC IFR departure route|departure arrow
TAC IFR combined arrival and departure route|bidirectional IFR
One-way VFR transition route|arrow VFR transition class bravo
Two-way VFR transition route|bidirectional arrow
VFR transition route with navaid ident and radial|VOR radial route
Terminal Radar Service Area|TRSA Harrisburg gray||trsa
TRSA name label|TRSA title||trsa
TRSA boundary line|TRSA boundary||trsa
TRSA sector label|TRSA floor ceiling||trsa
Special use airspace schedule|active activation FAA SUA||tfr
`),
group('sec-nav','VFR · Navigation & markings','Sectional/TAC · Navigation and markings',`
Charted intersection reporting point|intersection arrows facility
Isogonic line|magnetic variation declination
Isogonic value|magnetic variation degrees
Local magnetic disturbance note|magnetic unreliability warning
Isolated aeronautical light|isolated light site
Rotating or oscillating aeronautical light|aeronautical beacon
Rotating light with flashing code|aeronautical light code
Rotating light with course lights and site number|course light
Aeronautical identification light|identification light
Airport beacon|rotating flashing airport beacon
Marine navigational light|coast lighthouse||coast
Marine land light|land lighthouse
Marine light sector|sector light arc
Marine light color annotation|white red green blue orange black yellow
Fixed marine light|fixed light
Single occulting marine light|occulting
Group occulting marine light|group occult
Composite group occulting marine light|composite occult
Isophase marine light|isophase
Flashing marine light|flash
Group flashing marine light|group flash
Composite group flashing marine light|composite flash
Quick marine light|quick flash
Interrupted quick marine light|interrupted quick flash
Marine light Morse code|morse light
Fixed and flashing marine light|fixed flash
Alternating marine light|alternating color
Group marine light|light group
Long-flash marine light|long flash
Group quick-flashing marine light|group quick
Very quick-flashing marine light|very quick
Group very quick-flashing marine light|group very quick
Interrupted very quick-flashing marine light|interrupted very quick
Ultra quick-flashing marine light|ultra quick
Interrupted ultra quick-flashing marine light|interrupted ultra quick
VFR visual checkpoint|magenta flag
VFR checkpoint name underline|underlined checkpoint landmark
Standalone VFR waypoint|VP code four point star
VFR waypoint collocated with a checkpoint|VP code magenta flag together
RNAV waypoint|waypoint star
Obstruction below 1,000 feet AGL|tower obstacle small
Obstruction 1,000 feet AGL or higher|tower obstacle tall
Obstruction under construction or unverified|UC tower
Group obstruction below 1,000 feet AGL|tower group obstacles
Group obstruction 1,000 feet AGL or higher|tall group obstacles
Obstruction top elevation MSL|tower top elevation
Obstruction height AGL|parentheses tower height
High-intensity obstruction lights|strobe high intensity
Single wind turbine|windmill wind turbine
Wind turbine group|windmills turbine group
Wind turbine farm boundary|wind farm outline group turbine
Wind farm highest turbine unverified|UC MSL
Maximum Elevation Figure|MEF big blue numbers|Look for the large elevation numerals in the chart quadrangles.|terrain
Sectional inset outline|inset chart border
Terminal Area Chart coverage outline|TAC box extent||classB
Special chart coverage outline|special chart border||grand
Chart tabulation of airport and radar frequencies|margin table VHF UHF hours
Chart tabulation of special use airspace|margin table SUA
Chart tabulation of military training routes|margin table MTR
Chart legend or margin note|border notes original PDF||downloads
`),
group('sec-land','VFR · Landmarks & boundaries','Sectional/TAC · Cultural features',`
Railroad single track|single rail line
Railroad double track|double rail line
Railroad with more than two tracks|multi track rail
Railroad yard to scale|yard limiting track
Railroad yard location only|yard symbol
Railroad station|rail station
Railroad siding or short spur|siding track
Electric railroad|electric rail
Non-operating railroad|abandoned railroad dashed
Dismantled railroad|dismantled railroad label
Railroad under construction|rail under construction
Interstate route marker|interstate highway shield
U.S. route marker|US highway shield
Air-marked road identification label|air marking road marker
Dual-lane divided highway|category 1 road
Primary road|category 2 road
Secondary road|category 2 secondary
Road name label|street name
Trail|category 3 path
Road under construction|construction road
Road bridge or viaduct|road bridge bay crossing||sf
Railroad bridge or viaduct|train bridge
Ferry or ferry slip|ferry line
Ford|river crossing ford
Causeway|raised road water
Overpass or underpass|grade separation
Road tunnel|highway tunnel
Railroad tunnel|rail tunnel
Large city tint|yellow big city category 1||classB
City or large town tint|yellow city category 2||abe
Town or village point|small circle place category 3
International boundary|country border||niagara
Time-zone boundary|time zone line
State or province boundary|state line||rivers
Convention or mandate line|boundary convention mandate
International date line|date line
Dam without a road|dam water barrier||dam
Dam carrying a road|dam highway
Small lock|lock canal small
Passable lock|lock canal passable
Weir or jetty|weir jetty
Seawall|sea wall
Breakwater|harbor breakwater
Pier, wharf or quay|pier wharf quay
Surface pipeline|pipeline above ground
Underground pipeline|buried pipeline
Power transmission or telecommunication line|power line electric transmission cable
Landmark tank|tank storage landmark
Outdoor theater|drive-in theater
Mine or quarry landmark|mine quarry
Shaft mine or quarry|vertical shaft
Non-water well|oil well well transit
Racetrack|race track oval
Coast Guard station|USCG station
Landmark area outline|area landmark
Lookout tower and base elevation|lookout tower
Aerial cableway or conveyor|aerial cable cable car ski lift conveyor
Prominent pictorial landmark|pictorial landmark statue
`),
group('sec-water','VFR · Water, ice & shorelines','Sectional/TAC · Hydrography',`
Open water tint|ocean great lakes water color||lake
Inland water tint|lake water color||rivers
Open-to-inland water transition|tint hydrography||delBay
Definite shoreline|solid shoreline||coast
Fluctuating shoreline|seasonally changing shore
Unsurveyed shoreline|unsurveyed coast
Indefinite shoreline|indefinite coast
Man-made shoreline|artificial coast
Perennial lake|permanent lake
Non-perennial lake or pond|intermittent dry lake sebkha||salt
Lake elevation number|water surface elevation
Numerous small lakes pattern|representative pattern
Reservoir with natural shoreline|reservoir natural shore
Reservoir with man-made shoreline|dam lake
Reservoir too small to show to scale|located object reservoir square
Reservoir under construction|unfinished dam reservoir
Perennial stream|permanent river creek||rivers
Non-perennial stream|intermittent stream dry wash gulch arroyo
Fanned-out stream|alluvial fan stream
Braided stream|braided channels
Disappearing stream|underground stream disappearance
Seasonally fluctuating stream with undefined limits|seasonal floodplain
Seasonally fluctuating stream with defined maximum bank limits|seasonal floodbank
Abandoned or ancient stream|old river
Numerous streams pattern|representative drainage
Sand deposits in a riverbed|sand river
Wet sand areas|wet sand
Canal to scale|canal
Canal abandoned or under construction|construction canal abandoned
Abandoned canal to scale|abandoned canal
Perennial drainage or irrigation ditch|small canal ditch
Non-perennial drainage or irrigation ditch|seasonal small canal ditch
Aqueduct to scale|aqueduct
Abandoned or under-construction aqueduct|aqueduct abandoned
Underground aqueduct|aqueduct below ground
Suspended or elevated aqueduct|aqueduct above ground
Aqueduct tunnel|tunnel aqueduct
Kanat underground with air vents|qanat
Mangrove or nipa|mangrove swamp nipa
Waterfall on a double-line stream|falls double river
Waterfall on a single-line stream|falls single river
Rapids on a double-line stream|rapids double river
Rapids on a single-line stream|rapids single river
Cranberry bog|cranberry marsh
Land subject to inundation|flood tint swamp
Rocky or coral reef|reefs coral rock
Salt evaporator or exploited salt pan|salt works
Fish pond or hatchery|hatchery
Hummocks and ridges in water|hydrography ridges
Peat bog|peat marsh
Miscellaneous underwater feature|underwater hazard
Rice paddy|rice paddies
Spring, well or waterhole|waterhole fresh water
Swamp, marsh or bog|wetlands marsh
Exposed wreck|wreck above water
Isolated exposed rock|rocks
Isolated rock bare or awash|rock awash
Tundra|arctic tundra
Glacier|permanent ice glacier||alaskaGlacier
Glacial moraine|moraine glacial
Permanent polar ice|arctic ice
Pack ice|sea ice
Ice cliff|glacial cliff
Snowfield, ice field or ice cap|permanent snow
Foreshore or tidal flat|tidal flats mud flats||delBay
Ice peak|peak in ice
`),
group('sec-relief','VFR · Terrain & elevations','Sectional/TAC · Relief',`
Basic terrain contour|contour line brown||terrain
Intermediate contour|relief line
Auxiliary contour|supplemental contour
Approximate contour|dashed relief line
Depression contour|hachures depression
Contour elevation value|contour number||terrain
Layer tint|hypsometric elevation band elevation color||terrain
Shaded relief|terrain shading mountains shadow||terrain
Sand or gravel area|sand gravel relief
Sand dunes to scale|dune outline
Sand-dune hachures|dune stripes
Sand ridge|ridge dune sand
Quarry to scale|quarry outline relief
Crater|crater volcanic terrain
Spot elevation with accurate position|spot elevation point||terrain
Spot elevation approximate height|approximate elevation point
Highest spot elevation in general area|highest local
Highest spot elevation on chart|chart high point
Unsurveyed area|unsurveyed terrain
Uncontoured area|no contours area
Incomplete relief data note|relief data incomplete
Levee or esker|earth ridge esker
Rock strata outcrop|outcrop bedrock
Mountain pass|pass saddle pass elevation||mountains
Distorted surface area|distorted relief
Strip mine, mine dump or tailings|mine spoils
Escarpment, bluff, cliff or depression|cliff marks escarpment
Lava flow|volcanic lava area
`),
group('flyway','VFR · Flyway charts','VFR flyway planning chart',`
Suggested VFR flyway and altitude|planning flyway arrow recommended altitude||fly
Flyway airport runway pattern|civil landplane
Flyway abandoned airport|closed landmark
Flyway foreign airport|foreign airport note
Flyway private airport|Pvt
Flyway objectionable airport|objectionable
Flyway special VFR restriction|fixed wing SVFR
Flyway VOR|VOR
Flyway VOR/DME|VOR DME
Flyway VORTAC|VORTAC
Flyway DME|DME
Flyway NDB|NDB
Flyway NDB/DME|NDB DME
Flyway navaid defining airspace|navaid defining class
Flyway Class B boundary and shelf|bravo
Flyway Class B plus floor|plus floor
Flyway Class C boundary and shelf|charlie
Flyway Class D dashed boundary|delta
Flyway Class E surface boundary|echo SFC
Flyway national security SFRA|DC SFRA
Flyway flight restricted zone|FRZ
Flyway national-security TFR|TFR
Flyway special use airspace|MOA restricted prohibited warning alert
Flyway ADIZ|air defense identification
Flyway foreign airspace note|foreign
Flyway Mode C veil|ADS-B
Flyway special air traffic rules area|part 93
Flyway sporting event TFR site|stadium
Flyway national defense TFR|national defense
Flyway terminal radar service area|TRSA
Flyway IFR arrival route|arrival
Flyway IFR departure route|departure
Flyway combined IFR route|arrival departure
Flyway aerobatic practice area|aerobatic
Flyway glider operations area|gliders
Flyway hang glider area|hang gliding
Flyway ultralight area|ultralight
Flyway unmanned aircraft area|UAS
Flyway parachute area with frequency|parachute
Flyway space launch area|space
Flyway one-way VFR transition route|transition arrow
Flyway two-way VFR transition route|transition arrow
Flyway VFR transition route with navaid radial|navaid ident radial
Flyway special conservation area|conservation
Flyway NOAA marine sanctuary area|marine sanctuary
Flyway military training route|MTR
Flyway obstruction|obstacle lit unlit
Flyway unverified obstruction|under construction UC
Flyway high-intensity obstruction lights|strobe
Flyway VFR checkpoint|magenta flag underline
Flyway standalone VFR waypoint|VP
Flyway VFR waypoint collocated with checkpoint|VP flag
Flyway navigational data|route notes
Flyway divided highway|dual-lane primary
Flyway railroad|single multiple track
Flyway built-up area tint|yellow town landmark
Flyway pictorial landmark|visual landmark
Flyway international boundary|country border
Flyway power transmission line|power line
Flyway reservoir or major lake|hydrography
Flyway major river|hydrography
Flyway shoreline|water coast
Flyway spot elevation|mountain peak
`),
group('heli','VFR · Helicopter charts','Helicopter route charts',`
Helicopter route chart|New York heli route||heli
Helicopter chart landplane airport|airport runway
Helicopter chart seaplane base|water airport
Helicopter chart heliport|helipad
Helicopter chart unverified heliport|unverified
Helicopter chart airport data group|CTAF UNICOM ATIS ASOS AWOS ATC RP airport lighting
Helicopter chart foreign airport|FIR
Helicopter chart VOR|navaid
Helicopter chart VOR/DME|navaid
Helicopter chart VORTAC|navaid
Helicopter chart NDB and NDB/DME|navaid
Helicopter chart DME|navaid
Helicopter chart broadcast station|BS
Helicopter chart ASOS/AWOS|weather
Helicopter chart FSS box|flight service
Helicopter chart RCO|remote communications
Helicopter chart navaid compass rose|magnetic
Helicopter chart Class B shelf and surface area|bravo
Helicopter chart Class C shelf and surface area|charlie
Helicopter chart Class D boundary|delta
Helicopter chart Class E surface boundary|echo
Helicopter chart SFRA and FRZ|special flight rules flight restriction
Helicopter chart Part 93 area|special traffic
Helicopter chart ADIZ|air defense identification
Helicopter chart Mode C veil|mode c
Helicopter chart special security area|permanent restriction
Helicopter chart sporting event TFR site|stadium
Helicopter chart national defense TFR|national defense
Helicopter chart TRSA|terminal radar service area
Helicopter chart police zone|police zone
Helicopter chart SUA boundary|special use
Helicopter chart aerobatic area|aerobatics
Helicopter chart glider area|glider
Helicopter chart hang glider area|hang gliding
Helicopter chart ultralight area|ultralight
Helicopter chart unmanned aircraft area|UAS
Helicopter chart parachute area with frequency|skydiving
Helicopter chart space launch area|space
Helicopter chart military training route|MTR
Helicopter chart one-way route|directional arrow||heli
Helicopter primary route|route name tower frequency||heli
Helicopter secondary route|secondary route||heli
Helicopter altitude changeover point|changeover||heli
Helicopter route transition symbol|transition||heli
Helicopter compulsory reporting point|compulsory RP||heli
Helicopter non-compulsory reporting point|non compulsory RP||heli
Helicopter reporting point name|report name
Helicopter recommended altitude|recommended altitude||heli
Helicopter minimum altitude|minimum altitude
Helicopter maximum altitude|maximum altitude
Helicopter chart conservation area|wilderness
Helicopter chart NOAA marine sanctuary|marine
Helicopter chart foreign airspace note|foreign
Helicopter chart standalone VFR waypoint|VP
Helicopter chart collocated VFR waypoint and checkpoint|VP flag
Helicopter chart waypoint with checkpoint and reporting point|VP flag reporting
Helicopter chart VFR checkpoint underline|flag
Helicopter chart obstruction|tower
Helicopter chart group obstruction|towers
Helicopter chart high-intensity obstruction lights|strobe
Helicopter chart wind turbine farm|windmill
Helicopter chart navigation data|navigation notes
Helicopter chart maximum elevation figure|MEF
Helicopter chart single-track railroad|rail
Helicopter chart double-track railroad|rail
Helicopter chart divided highway|road
Helicopter chart boulevard or major street|road
Helicopter chart primary road|road
Helicopter chart bridge|bridge
Helicopter chart international boundary|country
Helicopter chart state/province boundary|state
Helicopter chart power transmission line|power
Helicopter chart pictorial landmark|pictorial
Helicopter chart built-up area tint|urban
Helicopter chart landmark|landmark
`),
group('caribbean','VFR · Caribbean charts','Caribbean VFR charts',`
Caribbean VFR Aeronautical Charts|CAC1 CAC2 Bahamas Cuba Haiti Puerto Rico||caribbean
Caribbean chart coastline and waterways|hydrography||caribbean
Caribbean chart terrain shading|relief terrain||caribbean
Caribbean chart major airport|foreign airports||caribbean
Caribbean chart radio navigation aids|navaids||caribbean
Caribbean chart controlled airspace|bravo class B||caribbean
Caribbean chart special use airspace|SUA||caribbean
United States airspace depiction comparison|comparison diagram class A B C D E G MSL AGL||chartGuide
`),
group('ifr','IFR · Enroute charts','IFR enroute chart',`
IFR enroute low chart|low altitude||fixLow
IFR enroute high chart|high altitude||ifrHigh
IFR enroute area chart|metro area inset
IFR enroute airport with instrument procedure|instrument approach blue green airport
IFR enroute airport without instrument procedure|airport VFR
IFR enroute military airport|military
IFR enroute private airport|private
IFR airport reference information box|airport frequency elevation runway
IFR airport emergency airport|emergency
IFR VOR|navaid hexagon
IFR VOR/DME|VORDME
IFR VORTAC|VORTAC
IFR TACAN|TACAN
IFR DME|DME
IFR NDB|beacon
IFR NDB/DME|NDBDME
IFR localizer course|LOC ILS
IFR localizer back course|BC
IFR navaid identification box|Morse frequency channel
IFR navaid decommissioning or shutdown mark|crosshatch
IFR navaid no-voice underline|frequency
IFR navigation point with a DME fix|DME distance
IFR compulsory reporting point|solid triangle
IFR non-compulsory reporting point|open hollow triangle
IFR compulsory RNAV waypoint|waypoint
IFR non-compulsory RNAV waypoint|waypoint
IFR mileage break|mileage change
IFR changeover point|COP frequency waypoint
IFR facility radial or bearing|radial course
IFR intersection using multiple navaids|fix||fixLow
IFR RNAV fix or waypoint|four point star||fixLow
IFR holding pattern|hold racetrack||fixLow
IFR holding pattern with maximum speed|holding speed
IFR holding pattern with minimum altitude|MHA
IFR Victor airway|V low altitude||fixLow
IFR T-route|low altitude RNAV||fixLow
IFR jet route|J high altitude||ifrHigh
IFR Q-route|RNAV high altitude||ifrHigh
IFR colored federal airway|LF MF green amber red blue
IFR direct route|direct ATS route
IFR oceanic route|oceanic PAC Atlantic
IFR ATS route|air traffic service
IFR route leg distance|mileage NM||fixLow
IFR one-way airway arrow|one way airway
IFR minimum enroute altitude|MEA||fixLow
IFR GNSS MEA|GNSS GPS MEA
IFR minimum obstruction clearance altitude|MOCA asterisk||fixLow
IFR minimum crossing altitude|MCA
IFR minimum reception altitude|MRA
IFR maximum authorized altitude|MAA
IFR minimum holding altitude|MHA
IFR off-route obstruction clearance altitude|OROCA grid elevation||fixLow
IFR uncontrolled airspace depiction|Class G
IFR Class B airspace|class bravo
IFR Class C airspace|class charlie
IFR Class D airspace|class delta
IFR Class E airspace|class echo
IFR special use airspace|SUA
IFR prohibited airspace|prohibited P
IFR restricted airspace|restricted R
IFR warning area|warning W
IFR military operations area|MOA
IFR alert area|alert A
IFR flight information region boundary|FIR CTA
IFR offshore control area boundary|OCA
IFR state or international boundary|boundary
IFR special flight rules area|SFRA
IFR air defense identification zone|ADIZ
IFR military training route|MTR
IFR ARTCC boundary|center boundary
IFR center frequency box|ARTCC remote air ground
IFR remote communication outlet|RCO
IFR Flight Service Station|FSS
IFR airport weather frequency|AWOS ASOS
IFR enroute terrain contour|terrain relief area
IFR hydrography water depiction|lakes rivers water
IFR cultural features|urban cities boundary
IFR VFR waypoint|VFR waypoint
IFR chart legend and inset boundary|coverage
`),
group('terminal','IFR · Procedures & diagrams','Terminal Procedures Publication',`
Instrument approach chart|approach plate IAP procedure||kabeApproach
Approach chart briefing strip|top row notes chart label||kabeApproach
Approach chart amendment and effective date|amendment Amdt AIRAC
Approach chart communications frequencies|ATIS approach tower CTAF
Approach chart navigation frequency|localizer VOR frequency channel
Approach chart approach course|final approach course
Approach chart runway landing distance|runway landing distance
Approach chart touchdown zone elevation|TDZE
Approach chart airport elevation|airport elevation
Approach chart airport lighting|approach light and runway lights
Approach chart notes and equipment requirements|DME required RNAV equipment
Approach chart altimeter setting notes|alternate altimeter source
Approach chart nonstandard takeoff minimums marker|T triangle
Approach chart alternate minimums marker|A triangle nonstandard
Approach chart alternate not authorized marker|NA alternate
Approach chart missed approach instructions|briefing strip missed
Approach chart minimum safe altitude|MSA 25 NM
Approach chart terminal arrival area|TAA sector
Approach chart planview scale boundary|planview ring
Approach chart non-to-scale inset|inset
Approach chart fly-by waypoint|RNAV fly by
Approach chart fly-over waypoint|RNAV fly over
Initial approach fix|IAF
Intermediate fix|IF
Final approach fix lightning bolt|FAF precision lightning bolt
Final approach fix Maltese cross|FAF nonprecision
Missed approach point|MAP
Approach chart visual descent point|VDP V
Localizer feather|LOC ILS front course
Back-course localizer feather|LOC BC reverse
Localizer-type directional aid course|LDA
Simplified directional facility course|SDF
Approach chart DME distance arc|DME arc
Approach chart feeder route|feeder route line
Approach chart procedure turn|barb
Holding in lieu of procedure turn|HILPT racetrack
Approach chart no procedure turn notation|NoPT
Approach chart radius-to-fix leg|RF curved path
Approach chart missed approach track|dashed line missed
Approach chart missed approach holding pattern|missed hold
Approach chart runway depiction|runway profile sketch
Approach chart obstacles|spot obstacle planview
Approach chart highest obstacle|highest obstacle arrow
Approach chart hydrography|planview water
Approach chart shaded terrain|planview terrain
Approach chart procedure profile view|profile altitude
Profile view glideslope or glidepath|GS GP vertical profile
Profile view stepdown fix|stepdown fix
Profile view minimum altitude|minimum at above
Profile view maximum altitude|at or below ceiling
Profile view mandatory altitude|at altitude restriction
Profile view altitude window|at or above and at or below
Profile view threshold crossing height|TCH
Profile view glidepath angle|GPA VDA
Profile view visual segment|visual flight path
Profile view timing table|FAF to MAP time
Profile view missed approach climb arrows|climb turn arrows
Landing minimums table|minimums DA MDA visibility
Landing category|A B C D E approach speed
Straight-in landing minimums|S runway
Circling minimums|circling MDA
Expanded circling minimums|inverse C
Landing decision altitude|DA decision
Minimum descent altitude|MDA descent
Height above touchdown|HAT
Height above airport|HAA
Runway visual range|RVR feet
Visibility in statute miles|minima SM
ILS landing minimums|precision landing
LPV landing minimums|LPV WAAS
LNAV/VNAV landing minimums|L NAV V NAV
LP landing minimums|localizer performance
LNAV landing minimums|lateral navigation
Airport sketch|small sketch approach||plate
Airport diagram|airport ground chart||kabeDiagram
Airport diagram hard-surface runway|pavement runway
Airport diagram soft-surface runway|grass turf
Airport diagram metal-surface runway|metal
Airport diagram water runway|water runway
Airport diagram closed runway|closed X runway
Airport diagram runway under construction|construction
Taxiway or parking pavement|apron hard surface
Non-hard-surface taxiway or parking|apron soft surface
Closed pavement|closed taxiway pavement
Displaced threshold|white arrows threshold
Stopway, overrun or blast pad|chevrons
Runway holding position|hold line
Airport diagram hot spot|HS circle hotspot incursion
Airport diagram magnetic variation|variation compass
Airport diagram runway dimensions|width length
Airport diagram runway bearing|mag heading
Airport diagram runway threshold elevation|threshold elevation
Airport diagram runway visual range location|RVR
Airport diagram control tower location|tower
Airport diagram runway arresting gear|arresting barrier
Airport diagram direction arrow|one way
Low-visibility taxi route|SMGCS
Airport movement area boundary|movement nonmovement
Airport diagram turnaround or run-up area|turnaround run up
Departure procedure chart|DP SID ODP||plate
Departure procedure route and transition|SID transition
Departure procedure climb gradient|feet per nautical mile
Departure procedure obstacle note|ODP
Departure procedure takeoff minimums|T
Departure procedure top altitude|top altitude
Departure procedure radar vector segment|vectors
Standard terminal arrival route chart|STAR arrival||plate
STAR arrival transition|arrival feeder
STAR speed restriction|maximum speed knots
STAR altitude restriction|crossing at above below
STAR runway transition|runway route
Charted visual flight procedure|CVFP||plate
Approach lighting system|ALS||plate
ALSF-1 approach lighting|ALSF1
ALSF-2 approach lighting|ALSF2
MALSR approach lighting|MALS sequenced flashers
MALSF approach lighting|MALS sequenced
MALS approach lighting|medium intensity
SSALR approach lighting|simplified short with alignment
SSALF approach lighting|sequenced flashers
SSALS approach lighting|simplified short
ODALS approach lighting|omnidirectional
RAIL runway alignment indicator lights|RAIL
REIL runway end identifier lights|REIL
PAPI visual glidepath|precision approach path indicator
VASI visual glidepath|visual approach slope indicator
`)
];
})();
