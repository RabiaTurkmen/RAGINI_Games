export const REGION_BY_CODE = {
  "01": "Akdeniz", "02": "Guneydogu Anadolu", "03": "Ege", "04": "Dogu Anadolu", "05": "Karadeniz",
  "06": "Ic Anadolu", "07": "Akdeniz", "08": "Karadeniz", "09": "Ege", "10": "Marmara",
  "11": "Marmara", "12": "Dogu Anadolu", "13": "Dogu Anadolu", "14": "Karadeniz", "15": "Akdeniz",
  "16": "Marmara", "17": "Marmara", "18": "Ic Anadolu", "19": "Karadeniz", "20": "Ege",
  "21": "Guneydogu Anadolu", "22": "Marmara", "23": "Dogu Anadolu", "24": "Dogu Anadolu", "25": "Dogu Anadolu",
  "26": "Ic Anadolu", "27": "Guneydogu Anadolu", "28": "Karadeniz", "29": "Dogu Anadolu", "30": "Dogu Anadolu",
  "31": "Akdeniz", "32": "Akdeniz", "33": "Akdeniz", "34": "Marmara", "35": "Ege",
  "36": "Dogu Anadolu", "37": "Karadeniz", "38": "Ic Anadolu", "39": "Marmara", "40": "Ic Anadolu",
  "41": "Marmara", "42": "Ic Anadolu", "43": "Ege", "44": "Dogu Anadolu", "45": "Ege",
  "46": "Akdeniz", "47": "Guneydogu Anadolu", "48": "Ege", "49": "Dogu Anadolu", "50": "Ic Anadolu",
  "51": "Ic Anadolu", "52": "Karadeniz", "53": "Karadeniz", "54": "Marmara", "55": "Karadeniz",
  "56": "Guneydogu Anadolu", "57": "Karadeniz", "58": "Ic Anadolu", "59": "Marmara", "60": "Karadeniz",
  "61": "Karadeniz", "62": "Dogu Anadolu", "63": "Guneydogu Anadolu", "64": "Ege", "65": "Dogu Anadolu",
  "66": "Ic Anadolu", "67": "Karadeniz", "68": "Ic Anadolu", "69": "Karadeniz", "70": "Ic Anadolu",
  "71": "Ic Anadolu", "72": "Guneydogu Anadolu", "73": "Guneydogu Anadolu", "74": "Karadeniz", "75": "Dogu Anadolu",
  "76": "Dogu Anadolu", "77": "Marmara", "78": "Karadeniz", "79": "Akdeniz", "80": "Akdeniz",
  "81": "Karadeniz"
};

export function getEnergeticColor(seed) {
  const palette = ["#118DFF", "#FF8A00", "#8A2BE2", "#00C878", "#22C0FF", "#FF5B2E", "#9D44FF", "#09B46B"];
  return palette[seed % palette.length];
}

export function shuffle(array) {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}
