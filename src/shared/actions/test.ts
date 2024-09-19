// import * as path from "path";

// const executablePath = path.join(
//   __dirname,
//   "../../scripts/normal+captcha.py"
// );
// const command = `python ${executablePath} remoteurl`;

// console.log(command);
import * as natural from 'natural';
import * as stopWords from 'stopword';

// Function to clean and tokenize text
function tokenizeText(text: any) {
  const tokenizer = new natural.WordTokenizer();
  return tokenizer.tokenize(text.toLowerCase());
}

// Function to extract keywords using TF-IDF
export const extractKeywordsTFIDF = (titles: any) => {
  const tfidf = new natural.TfIdf();
  
  // Tokenize and add the titles to the TF-IDF calculation
  titles.forEach((title: any) => {
    const filteredTitle = stopWords.removeStopwords(tokenizeText(title));
    tfidf.addDocument(filteredTitle);
  });

  const keywordsByProduct: any = [];

  // Extract top keywords for each title
  titles.forEach((title: any, index: any) => {
    const keywords: any = [];
    
    tfidf.listTerms(index).forEach(item => {
      keywords.push(item.term); // Capture all terms with their score
    });

    keywordsByProduct.push(keywords);
  });

  return keywordsByProduct;
}

const data = [
  {
    title: 'ProCase for iPad 9th Generation 2021/ iPad 8th Generation 2020/ iPad 7th Generation 2019 Case, iPad 10.2 Case iPad Cover 9th Generation -Black',
    brandValue: 'Pro Case'
  },
  {
    title: 'Akkerds Case Compatible with iPad 10.2 Inch 2021/2020/2019, for iPad 9th/8th/7th Generation Case with Pencil Holder, Protective Case with Soft TPU Back, Auto Sleep/Wake Cover, Sky Blue',
    brandValue: 'Akkerds'
  },
  {
    title: 'MoKo Case for Galaxy Tab A9+/A9 Plus 11 inch 2023, Slim Stand Protective Smart Cover with Hard PC Translucent Back Shell for Tab A9 Plus Tablet (SM-X210/X216/X218), Auto Wake/Sleep, Black',
    brandValue: 'Mo Ko'
  },
  {
    title: 'Moko Case for iPad 10.2 iPad 9th Generation 2021/ iPad 8th Generation 2020/ iPad 7th Generation 2019, Slim Stand Hard Back Shell Smart Cover Case for iPad 10.2 inch, Auto Wake/Sleep, Rose Gold',
    brandValue: 'Mo Ko'
  },
  {
    title: 'Fintie Rotating Case for iPad 9th Generation (2021) / 8th Generation (2020) / 7th Gen (2019) 10.2 Inch - 360 Degree Rotating Stand Cover with Pencil Holder, Auto Wake Sleep, Purple',
    brandValue: 'Fintie'
  },
  {
    title: 'Timecity Case for iPad 9th/ 8th/ 7th Generation 10.2 inch (Case for iPad 9/8/ 7 Gen): with Strong Protection, Screen Protector, Hand/Shoulder Strap, Rotating Stand, Pencil Holder - Black',
    brandValue: 'Timecity'
  },
  {
    title: 'Case for iPad 9th/8th/7th Generation 2021/2020/2019(10.2 inch), Heavy Duty Military Grade Shockproof Rugged Protective 10.2" Cover with Built-in Stand for iPad 9 8 7 Gen (Black+Red)',
    brandValue: 'Zone Foker'
  },
  {
    title: 'Fintie Case for iPad 9th / 8th / 7th Generation (2021/2020/2019) 10.2 Inch - [Corner Protection] Multi-Angle Viewing Stand Cover with Pocket & Pencil Holder, Auto Sleep Wake, Purple',
    brandValue: 'Fintie'
  },
  {
    title: 'CoBak Case for Samsung Galaxy Tab A9 Plus 10.9-inch 2023, Multi-Viewing Angles, All New PU Leather Smart Cover with Auto Sleep Wake Feature for Samsung Galaxy Tab A9 + Tablet',
    brandValue: 'Co Bak'
  },
  {
    title: 'for iPad 9th Generation Case, iPad 8th 7th Generation Case, iPad 10.2 Inch 2021/2020/2019 Case, Heavy Duty Rugged Shockproof Protective Cover with Kickstand for Kids Purple/Green',
    brandValue: 'Zone Foker'
  },
  {
    title: "Rantice iPad 9th Generation Case, iPad 8th Generation Case, iPad 7th Generation Case, Hybrid Shockproof Rugged Drop Protective Case with Kickstand for iPad 10.2'' (Black)",
    brandValue: 'Rantice'
  },
  {
    title: 'ZUGU CASE for iPad 10.9 Inch Case iPad 10th Generation Case (2022) | Slim Protective Case | Magnetic Stand & Sleep/Wake Cover 10th Gen iPad Case | Model #s A2696, A2757, A2777 | Stealth Black',
    brandValue: 'Zugu Case'
  },
  {
    title: 'JETech Case for Samsung Galaxy Tab S9 FE 10.9-Inch with S Pen Holder, Slim Folio Stand Protective Tablet Cover, Multi-Angle Viewing (Black)',
    brandValue: 'Je Tech'
  },
  {
    title: 'Azzsy Case for Samsung Galaxy Tab A9+/A9 Plus 11” 2024 Model (SM-X210/X216/X218), Heavy Duty Shockproof Rugged High Impact Protective Case, Black',
    brandValue: 'Azzsy'
  },
  {
    title: 'MoKo Case Fit Galaxy Tab A9 Plus 11-Inch 2023 (SM-X210/X216/X218), Shockproof Full Body Rugged Stand Back Cover Built-in Screen Protector Fit Galaxy Tab A9+ 11" 2023, Black',
    brandValue: 'Mo Ko'
  },
  {
    title: 'Zugu Case for iPad Pro 13 (M4) 2024, Slim Protective Cover with Apple Pencil Holder, Auto Wake/Sleep, Multiple Viewing Angles - iPad Pro 13 Inch Case, iPad 13 Case, iPad Pro 13 Inch Case - Black',
    brandValue: 'Zugu Case'
  },
  {
    title: 'All-New Amazon Fire HD 8 & 8 Plus Tablet Case (12th/10th Generation, 2022/2020), DJ&RPPQ Smart Trifold Stand Cover with Soft TPU Back and Auto Wake/Sleep Also for 8in Sony Nokia-Navy Blue',
    brandValue: 'Dj Rppq'
  },
  {
    title: 'ESR for iPad Pro 13 Inch Case M4(2024), Powerful Magnetic Attachment, Slim Trifold Stand Case, Supports Pencil Pro and Pencil(USB-C), Auto Wake/Sleep, Durable Protection, Rebound Series, Black',
    brandValue: 'Esr'
  },
  {
    title: 'Fintie Case for Samsung Galaxy Tab A9 Plus/A9+ 5G 11 Inch 2023 Model (SM-X210/X216/X218), Multi-Angle Viewing Smart Stand Back Cover with Pocket Auto Wake/Sleep, Turquoise',
    brandValue: 'Fintie'
  },
  {
    title: 'ZryXal New iPad Pro 12.9 Inch Case 2022/2021/2020(6th/5th/4th Gen) with Pencil Holder,Smart Case [Support Touch ID and Auto Wake/Sleep] with Auto 2nd Gen Pencil Charging (Midnight Green)',
    brandValue: 'Zry Xal'
  },
  {
    title: 'Fintie Case for iPad 10th Generation 10.9 Inch (2022 Model), Multi-Angle Viewing Protective Stand Cover with Pencil Holder & Pocket, Auto Sleep/Wake, Marble Pink',
    brandValue: 'Fintie'
  },
  {
    title: 'MoKo Case for iPad 9th Generation 2021/ iPad 8th Generation 2020/ iPad 7th Generation 2019, Soft Translucent TPU Frosted Back Cover Slim iPad 10.2 inch Case with Stand, Auto Wake/Sleep, Rose Gold',
    brandValue: 'Mo Ko'
  },
  {
    title: 'SEYMAC Case for Samsung Galaxy Tab A9+/ A9 Plus Case 11" 2023 (SM-X210/X216/X218), Heavy Duty Shockproof Protective Case with Screen Protector, Rotating Stand and Hand/Shoulder Strap, Black',
    brandValue: 'Seymac'
  }
]

// const titles = 

const output = [
  {
    title: 'All-New Amazon Fire HD 8 & 8 Plus Tablet Case (12th/10th Generation, 2022/2020), DJ&RPPQ Smart Trifold Stand Cover with Soft TPU Back and Auto Wake/Sleep Also for 8in Sony Nokia-Navy Blue',
    similarity_score: 0.2848053574562073
  },
  {
    title: 'for iPad 9th Generation Case, iPad 8th 7th Generation Case, iPad 10.2 Inch 2021/2020/2019 Case, Heavy Duty Rugged Shockproof Protective Cover with Kickstand for Kids Purple/Green',
    similarity_score: 0.2731247842311859
  },
  {
    title: 'Moko Case for iPad 10.2 iPad 9th Generation 2021/ iPad 8th Generation 2020/ iPad 7th Generation 2019, Slim Stand Hard Back Shell Smart Cover Case for iPad 10.2 inch, Auto Wake/Sleep, Rose Gold',
    similarity_score: 0.2638644576072693
  },
  {
    title: 'MoKo Case for iPad 9th Generation 2021/ iPad 8th Generation 2020/ iPad 7th Generation 2019, Soft Translucent TPU Frosted Back Cover Slim iPad 10.2 inch Case with Stand, Auto Wake/Sleep, Rose Gold',
    similarity_score: 0.2602115869522095
  },
  {
    title: 'MoKo Case for Galaxy Tab A9+/A9 Plus 11 inch 2023, Slim Stand Protective Smart Cover with Hard PC Translucent Back Shell for Tab A9 Plus Tablet (SM-X210/X216/X218), Auto Wake/Sleep, Black',
    similarity_score: 0.24943135678768158
  },
  {
    title: 'Rantice iPad 9th Generation Case, iPad 8th Generation Case, iPad 7th Generation Case, Hybrid Shockproof Rugged Drop Protective Case with Kickstand for iPad 10.2 (Black)',
    similarity_score: 0.2344188690185547
  },
  {
    title: 'ZUGU CASE for iPad 10.9 Inch Case iPad 10th Generation Case (2022) | Slim Protective Case | Magnetic Stand & Sleep/Wake Cover 10th Gen iPad Case | Model #s A2696, A2757, A2777 | Stealth Black',
    similarity_score: 0.23173537850379944
  },
  {
    title: 'ESR for iPad Pro 13 Inch Case M4(2024), Powerful Magnetic Attachment, Slim Trifold Stand Case, Supports Pencil Pro and Pencil(USB-C), Auto Wake/Sleep, Durable Protection, Rebound Series, Black',
    similarity_score: 0.22302928566932678
  },
  {
    title: 'MoKo Case Fit Galaxy Tab A9 Plus 11-Inch 2023 (SM-X210/X216/X218), Shockproof Full Body Rugged Stand Back Cover Built-in Screen Protector Fit Galaxy Tab A9+ 11" 2023, Black',
    similarity_score: 0.220793217420578
  },
  {
    title: 'Case for iPad 9th/8th/7th Generation 2021/2020/2019(10.2 inch), Heavy Duty Military Grade Shockproof Rugged Protective 10.2" Cover with Built-in Stand for iPad 9 8 7 Gen (Black+Red)',
    similarity_score: 0.22015011310577393
  },
  {
    title: 'Fintie Rotating Case for iPad 9th Generation (2021) / 8th Generation (2020) / 7th Gen (2019) 10.2 Inch - 360 Degree Rotating Stand Cover with Pencil Holder, Auto Wake Sleep, Purple',
    similarity_score: 0.21620815992355347
  },
  {
    title: 'Fintie Case for iPad 9th / 8th / 7th Generation (2021/2020/2019) 10.2 Inch - [Corner Protection] Multi-Angle Viewing Stand Cover with Pocket & Pencil Holder, Auto Sleep Wake, Purple',
    similarity_score: 0.2146400511264801
  },
  {
    title: 'Zugu Case for iPad Pro 13 (M4) 2024, Slim Protective Cover with Apple Pencil Holder, Auto Wake/Sleep, Multiple Viewing Angles - iPad Pro 13 Inch Case, iPad 13 Case, iPad Pro 13 Inch Case - Black',
    similarity_score: 0.21164241433143616
  },
  {
    title: 'Fintie Case for iPad 10th Generation 10.9 Inch (2022 Model), Multi-Angle Viewing Protective Stand Cover with Pencil Holder & Pocket, Auto Sleep/Wake, Marble Pink',
    similarity_score: 0.20685474574565887
  },
  {
    title: 'Timecity Case for iPad 9th/ 8th/ 7th Generation 10.2 inch (Case for iPad 9/8/ 7 Gen): with Strong Protection, Screen Protector, Hand/Shoulder Strap, Rotating Stand, Pencil Holder - Black',
    similarity_score: 0.20592451095581055
  },
  {
    title: 'CoBak Case for Samsung Galaxy Tab A9 Plus 10.9-inch 2023, Multi-Viewing Angles, All New PU Leather Smart Cover with Auto Sleep Wake Feature for Samsung Galaxy Tab A9 + Tablet',
    similarity_score: 0.20114140212535858
  },
  {
    title: 'Fintie Case for Samsung Galaxy Tab A9 Plus/A9+ 5G 11 Inch 2023 Model (SM-X210/X216/X218), Multi-Angle Viewing Smart Stand Back Cover with Pocket Auto Wake/Sleep, Turquoise',
    similarity_score: 0.1906694918870926
  },
  {
    title: 'SEYMAC Case for Samsung Galaxy Tab A9+/ A9 Plus Case 11" 2023 (SM-X210/X216/X218), Heavy Duty Shockproof Protective Case with Screen Protector, Rotating Stand and Hand/Shoulder Strap, Black',
    similarity_score: 0.1767410933971405
  },
  {
    title: 'JETech Case for Samsung Galaxy Tab S9 FE 10.9-Inch with S Pen Holder, Slim Folio Stand Protective Tablet Cover, Multi-Angle Viewing (Black)',
    similarity_score: 0.17531852424144745
  },
  {
    title: 'ZryXal New iPad Pro 12.9 Inch Case 2022/2021/2020(6th/5th/4th Gen) with Pencil Holder,Smart Case [Support Touch ID and Auto Wake/Sleep] with Auto 2nd Gen Pencil Charging (Midnight Green)',
    similarity_score: 0.1421995311975479
  },
  {
    title: 'ProCase for iPad 9th Generation 2021/ iPad 8th Generation 2020/ iPad 7th Generation 2019 Case, iPad 10.2 Case iPad Cover 9th Generation -Black',
    similarity_score: 0.1355660855770111
  },
  {
    title: 'Azzsy Case for Samsung Galaxy Tab A9+/A9 Plus 11” 2024 Model (SM-X210/X216/X218), Heavy Duty Shockproof Rugged High Impact Protective Case, Black',
    similarity_score: 0.13176044821739197
  },
  {
    title: 'Akkerds Case Compatible with iPad 10.2 Inch 2021/2020/2019, for iPad 9th/8th/7th Generation Case with Pencil Holder, Protective Case with Soft TPU Back, Auto Sleep/Wake Cover, Sky Blue',
    similarity_score: 0.0965193659067154
  }
]



