// to.ts

// import {TranslationServiceClient} from "@google-cloud/translate";

export function jsonCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => jsonCamelCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/([-_][a-z])/g, (group) =>
        group.toUpperCase().replace('-', '').replace('_', '')
      );
      result[camelKey] = jsonCamelCase(obj[key]);
      return result;
    }, {} as Record<string, any>);
  }
  return obj;
}


// const translationClient = new TranslationServiceClient();

// async function translateText() {
//   // Construct request
//   const request = {
//     // parent: `projects/${projectId}/locations/${location}`,
//     // contents: [text],
//     mimeType: 'text/plain', // mime types: text/plain, text/html
//     sourceLanguageCode: 'en',
//     targetLanguageCode: 'sr-Latn',
//   };

//   // Run request
//   const [response] = await translationClient.translateText(request);

//   for (const translation of response.translations) {
//     console.log(`Translation: ${translation.translatedText}`);
//   }
// }