package services

// List of common words to ignore during analysis in Finnish and English.
var stopWords = map[string]bool{
	// Finnish general stop words (conjunctions, prepositions, pronouns, adverbs)
	"ja": true, "se": true, "on": true, "että": true, "kuin": true, "mutta": true,
	"he": true, "ne": true, "kun": true, "jos": true, "tai": true, "vai": true,
	"minä": true, "sinä": true, "me": true, "te": true, "tämä": true, "nämä": true,
	"tuo": true, "joka": true, "jotka": true, "mikä": true, "mitä": true, "joku": true,
	"jokin": true, "jokainen": true, "kaikki": true, "kaikkien": true, "kaikkea": true,
	"kaikille": true, "kaikista": true, "kaikilla": true, "oma": true, "omat": true,
	"muu": true, "muut": true, "toinen": true, "toiset": true, "vaan": true, "sillä": true,
	"eli": true, "eikä": true, "niin": true, "noin": true, "näin": true, "siten": true,
	"miten": true, "kuten": true, "miksi": true, "myös": true, "jopa": true, "ehkä": true,
	"kyllä": true, "pian": true, "heti": true, "vain": true, "vaikka": true, "koska": true,
	"siksi": true, "tässä": true, "siinä": true, "siitä": true, "tähän": true, "tälle": true,
	"heille": true, "hänelle": true, "minulle": true, "sinulle": true, "meille": true,
	"heiltä": true, "häneltä": true, "minulta": true, "sinulta": true, "meiltä": true,
	"heidän": true, "hänen": true, "minun": true, "sinun": true, "meidän": true,
	"teidän": true,

	// Finnish common auxiliary verbs & forms of "olla"
	"olla": true, "olen": true, "olet": true, "olemme": true, "olette": true, "ovat": true,
	"oli": true, "olin": true, "olit": true, "olimme": true, "olitte": true, "olivat": true,
	"ollut": true, "olleet": true, "olisi": true, "olisin": true, "olisit": true, "olisimme": true,
	"olisitte": true, "olisivat": true, "tulee": true, "tuli": true, "tulivat": true, "voida": true,
	"voi": true, "voivat": true, "voisi": true, "pitää": true, "piti": true, "pitäisi": true,

	// English stop words
	"the": true, "and": true, "that": true, "shall": true, "unto": true, "for": true,
	"with": true, "from": true, "they": true, "them": true, "their": true, "this": true,
	"these": true, "those": true, "have": true, "has": true, "had": true, "been": true,
	"were": true, "was": true, "are": true, "you": true, "your": true, "him": true,
	"his": true, "her": true, "she": true, "its": true, "our": true, "will": true,
	"would": true, "should": true, "could": true, "then": true, "than": true, "when": true,
	"where": true, "what": true, "which": true, "who": true, "whom": true, "about": true,
	"into": true, "over": true, "after": true, "before": true, "here": true, "there": true,
	"some": true, "such": true, "every": true, "other": true, "another": true,

	// Metadata and Citation terms (Finnish & English)
	"kr92": true, "kr33": true, "kr38": true, "web": true, "kjv": true, "biblia": true,
	"translation": true, "käännös": true, "luku": true, "jae": true, "jakeet": true,
	"chapter": true, "verse": true, "verses": true, "bible": true, "raamattu": true,
	"muistikirja": true, "notebook": true, "cell": true, "solu": true, "command": true,
	"komento": true, "ref": true, "refs": true, "read": true, "search": true, "suggest": true,

	// Finnish Bible book names & abbreviations (all lowercase)
	"genesis": true, "exodus": true, "leviticus": true, "numbers": true, "deuteronomy": true,
	"joosua": true, "joos": true, "tuomarien": true, "tuom": true, "ruut": true, "samuelin": true,
	"sam": true, "kuninkaiden": true, "aikakirjan": true, "aik": true, "esra": true,
	"nehemia": true, "neh": true, "ester": true, "job": true, "psalmit": true, "ps": true,
	"sananlaskut": true, "snl": true, "saarnaaja": true, "saarn": true, "laulujen": true,
	"laul": true, "jesaja": true, "jes": true, "jeremia": true, "jer": true, "valitusvirret": true,
	"val": true, "esekiel": true, "esek": true, "daniel": true, "dan": true, "hoosea": true,
	"hoos": true, "joel": true, "amos": true, "obadja": true, "obad": true, "joona": true,
	"miika": true, "miik": true, "nahum": true, "nah": true, "habakuk": true, "hab": true,
	"sefanja": true, "sef": true, "haggai": true, "hag": true, "sakaria": true, "sak": true,
	"malakia": true, "mal": true, "matteus": true, "matt": true, "markus": true, "mark": true,
	"luukas": true, "luuk": true, "johannes": true, "joh": true, "apostolien": true, "apt": true,
	"roomalaisille": true, "room": true, "korinttolaisille": true, "kor": true, "galatalaisille": true,
	"gal": true, "efesolaisille": true, "efes": true, "filippiläisille": true, "fil": true,
	"kolossalaisille": true, "kol": true, "tessalonikalaisille": true, "tess": true, "timoteukselle": true,
	"tim": true, "titukselle": true, "tit": true, "filemonille": true, "filem": true, "heprealaisille": true,
	"hepr": true, "jaakobin": true, "jaak": true, "pietarin": true, "piet": true, "juudan": true,
	"juud": true, "ilmestyskirja": true, "ilm": true, "mooseksen": true, "moos": true,

	// English Bible book names & abbreviations (all lowercase)
	"joshua": true, "judges": true, "ruth": true, "samuel": true, "kings": true, "chronicles": true,
	"ezra": true, "nehemiah": true, "esther": true, "psalms": true, "proverbs": true, "ecclesiastes": true,
	"isaiah": true, "jeremiah": true, "lamentations": true, "ezekiel": true, "hosea": true,
	"obadiah": true, "jonah": true, "micah": true, "zephaniah": true, "zechariah": true,
	"matthew": true, "acts": true, "romans": true, "corinthians": true, "galatians": true,
	"ephesians": true, "philippians": true, "colossians": true, "thessalonians": true, "timothy": true,
	"hebrews": true, "james": true, "peter": true, "jude": true, "revelation": true,
}
