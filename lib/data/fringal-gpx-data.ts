// Auto-extracted from GPX recordings of Fringal (فرينغال) route
// Smoothed with Douglas-Peucker (ε≈5.5m) — GPS noise removed, road shape preserved
// File 1: فرينغال الانطلاق (Outbound: Shabour → Mosque Al-Forqan) 45 pts
// File 2: فرينغال العودة   (Return:   Mosque Al-Forqan → Shabour)   39 pts

export const fringalOutboundCoords: [number, number][] = [[35.42722175,7.14420703],[35.4272355,7.14380632],[35.42739321,7.1434869],[35.42743872,7.14297659],[35.42766979,7.14224408],[35.43159891,7.13856953],[35.43191707,7.13838659],[35.43193526,7.13823914],[35.43136669,7.13794153],[35.42889346,7.13472313],[35.42651929,7.13233458],[35.42584096,7.13112052],[35.42559633,7.13082323],[35.42289072,7.12881755],[35.42178463,7.1278526],[35.41971249,7.12624477],[35.41969422,7.12607392],[35.42020222,7.12492723],[35.42016084,7.12472915],[35.41946985,7.12432047],[35.41871618,7.125223],[35.41863281,7.1252648],[35.41851877,7.12519559],[35.41800771,7.1245659],[35.41685537,7.12257442],[35.41470056,7.12104594],[35.41145498,7.11705473],[35.4111803,7.11689546],[35.41042284,7.11667944],[35.40933562,7.11606018],[35.40866369,7.11553067],[35.40775292,7.11453306],[35.40699867,7.11440317],[35.40620116,7.11375162],[35.40379054,7.1127341],[35.40328673,7.11239099],[35.40259876,7.11176327],[35.4023599,7.11148267],[35.40221707,7.1110489],[35.40193675,7.11072936],[35.40137373,7.10968482],[35.39760763,7.10444443],[35.39709815,7.10338642],[35.39627858,7.10086553],[35.39625998,7.10095569]] as unknown as [number, number][]

export const fringalReturnCoords: [number, number][] = [[35.39628016,7.10094134],[35.39641571,7.10116033],[35.39710463,7.10338807],[35.3975186,7.10426884],[35.40148941,7.10981601],[35.40208934,7.11115982],[35.40278478,7.11198867],[35.40383489,7.1127668],[35.40626414,7.11378373],[35.40693123,7.11437224],[35.40771988,7.11451747],[35.40862175,7.11548723],[35.40939894,7.11611828],[35.4102894,7.11662604],[35.41146362,7.11704586],[35.41466726,7.1210055],[35.41515161,7.1214175],[35.41637281,7.12221042],[35.41689779,7.12274358],[35.41740471,7.1234065],[35.41795639,7.12448415],[35.41858759,7.12525864],[35.41871232,7.12525516],[35.4194293,7.12432827],[35.42016614,7.12474515],[35.42021385,7.12499259],[35.41970371,7.12603771],[35.41974477,7.12628654],[35.42250603,7.12851134],[35.4255433,7.13080372],[35.4258666,7.13119005],[35.42652268,7.13233607],[35.4290397,7.13489454],[35.43069847,7.13695975],[35.43132593,7.13802467],[35.43167125,7.13829401],[35.43164215,7.13850129],[35.42771249,7.1422294],[35.42732528,7.14307725]] as unknown as [number, number][]

export const fringalOutboundWaypoints = [
  { name: "منطقة الانطلاق — الشابور", nameEn: "Departure — Shabour",    coords: [35.42722022, 7.14421289] as [number, number], isTerminal: true,  isStart: true  },
  { name: "المحطة 1",                  nameEn: "Stop 1",                 coords: [35.43126942, 7.1378072 ] as [number, number], isTerminal: false, isStart: false },
  { name: "الكوشة",                    nameEn: "Cosha",                  coords: [35.42695195, 7.13272788] as [number, number], isTerminal: false, isStart: false },
  { name: "السوق",                     nameEn: "Souk",                   coords: [35.42449995, 7.12998427] as [number, number], isTerminal: false, isStart: false },
  { name: "باطيمات",                   nameEn: "Batimat",                coords: [35.42258364, 7.12852322] as [number, number], isTerminal: false, isStart: false },
  { name: "باطيمات الشابور",           nameEn: "Batimat Shabour",        coords: [35.41986393, 7.12457735] as [number, number], isTerminal: false, isStart: false },
  { name: "مسجد الفرقان",              nameEn: "Mosque Al-Forqan (End)", coords: [35.39635079, 7.10094865] as [number, number], isTerminal: true,  isStart: false },
]

export const fringalReturnWaypoints = [
  { name: "مسجد الفرقان — نقطة الانطلاق", nameEn: "Mosque Al-Forqan (Start)", coords: [35.39626538, 7.10095466] as [number, number], isTerminal: true,  isStart: true  },
  { name: "المحطة 1 عودة",                nameEn: "Return Stop 1",             coords: [35.40953855, 7.1161976 ] as [number, number], isTerminal: false, isStart: false },
  { name: "المحطة 2 عودة",                nameEn: "Return Stop 2",             coords: [35.41227652, 7.1180196 ] as [number, number], isTerminal: false, isStart: false },
  { name: "باطيمات الشابور",              nameEn: "Batimat Shabour",           coords: [35.41977443, 7.12453797] as [number, number], isTerminal: false, isStart: false },
  { name: "باطيمات",                      nameEn: "Batimat",                   coords: [35.42250246, 7.12849843] as [number, number], isTerminal: false, isStart: false },
  { name: "السوق",                        nameEn: "Souk",                      coords: [35.42402358, 7.12966291] as [number, number], isTerminal: false, isStart: false },
  { name: "الكوشة",                       nameEn: "Cosha",                     coords: [35.42739267, 7.13320309] as [number, number], isTerminal: false, isStart: false },
  { name: "مركز الشرطة",                  nameEn: "Police HQ",                 coords: [35.42858105, 7.13442336] as [number, number], isTerminal: false, isStart: false },
  { name: "الحديقة",                      nameEn: "Al-Hadika",                 coords: [35.43102017, 7.13748972] as [number, number], isTerminal: false, isStart: false },
  { name: "باطيمات 6",                    nameEn: "Batimat 6",                 coords: [35.42926796, 7.14070754] as [number, number], isTerminal: false, isStart: false },
  { name: "الشابور — نهاية الطريق",       nameEn: "Shabour — End",             coords: [35.4273755,  7.14302098] as [number, number], isTerminal: true,  isStart: false },
]
