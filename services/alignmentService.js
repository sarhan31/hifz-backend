const normalizeArabic = (text) => {
    if (!text) return "";
    return text
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, "") // Remove Tashkeel (diacritics)
        .replace(/[إأآا]/g, "ا") // Normalize Alif
        .replace(/ى/g, "ي") // Normalize Alif Maqsura
        .replace(/ؤ/g, "و") // Normalize Waw with Hamza
        .replace(/ئ/g, "ي") // Normalize Ya with Hamza
        .replace(/ة/g, "ه"); // Normalize Ta Marbuta
};

class AlignmentService {
    compareRecitation(expectedText, spokenText) {
        if (!expectedText) return [];
        
        const expectedWords = expectedText.trim().split(/\s+/);
        const spokenWords = spokenText ? spokenText.trim().split(/\s+/) : [];
        
        const result = [];

        for (let i = 0; i < expectedWords.length; i++) {
            const expected = expectedWords[i];
            const spoken = spokenWords[i];

            let status = "missing";

            if (spoken) {
                // Normalize both for comparison
                const normExpected = normalizeArabic(expected);
                const normSpoken = normalizeArabic(spoken);

                if (normExpected === normSpoken) {
                    status = "correct";
                } else {
                    status = "mismatch";
                }
            }

            result.push({
                word: expected,
                status: status
            });
        }

        return result;
    }
}

module.exports = new AlignmentService();
