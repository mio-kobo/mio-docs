// Each probe exercises a useful API and its behavior on a boundary or invalid
// argument. The assertions below are independent of the documentation snapshots.
export const bunkoCases = {
  'kiso/array': {
    source: 'kaku a = array.make[int64](2, 7); array.push(a, 9); chant(a[2]); chant(len(array.make[int64](0, 7)));',
    stdout: '9\n0\n',
    invalid: 'array.make[int64](-1, 0);',
    error: /length|negative/i,
  },
  'kiso/bytes': {
    source: 'kaku a: []uint8 = [uint8(7)]; kaku empty: []uint8 = []; chant(bytes.contains(a, uint8(7))); chant(bytes.index(empty, uint8(7)));',
    stdout: 'hai\n-1\n',
  },
  'kiso/convert': {
    source: 'kaku a = convert.parse_int("-42"); moshi (a != mu) { chant(a); } chant(convert.parse_int("9223372036854775808") == mu);',
    stdout: '-42\nhai\n',
  },
  'kiso/crypto/sha256': {
    imports: 'yobu "kiso/string";',
    source: 'kaku digest = sha256.sum(string.to_bytes("abc")); kaku i = 0; aida (i < len(digest)) { chant(digest[i]); i = i + 1; } chant(len(sha256.sum_range(sha256.context(), string.to_bytes("abc"), -1, 3)));',
    stdout: [...Buffer.from('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'hex'), 0].join('\n') + '\n',
  },
  'kiso/encoding/binary': {
    source: 'kaku data: []uint8 = [uint8(1), uint8(2)]; kaku reader = binary.reader(data); chant(binary.reader_read_u16_be(reader).value); chant(binary.reader_read_u8(reader).error != mu);',
    stdout: '258\nhai\n',
  },
  'kiso/encoding/json': {
    imports: 'yobu "kiso/string";',
    source: String.raw`kaku doc = json.parse(string.to_bytes("{\"a\":42}")); chant(json.render(doc, doc.root)); chant(json.parse(string.to_bytes("{")).error != "");`,
    stdout: '{"a":42}\nhai\n',
  },
  'kiso/math': {
    source: 'chant(math.gcd(12, 18)); chant(math.is_nan(math.sqrt[float64](-1.0)));',
    stdout: '6\nhai\n',
  },
  'kiso/path': {
    source: String.raw`chant(path.clean("/a/../b")); chant(path.clean("C:\\x")); chant(path.clean(""));`,
    stdout: '/b\nC:\\x\n.\n',
  },
  'kiso/regexp': {
    source: String.raw`chant(regexp.matches(regexp.compile("^\\p{Han}+$"), "漢字")); chant(regexp.compile("[").error != "");`,
    stdout: 'hai\nhai\n',
  },
  'kiso/regexp/unicode_data': {
    source: 'chant(len(unicode_data.lookup("han")) > 0); chant(len(unicode_data.lookup("MioNoSuchProperty")));',
    stdout: 'hai\n0\n',
  },
  'kiso/string': {
    source: 'chant(string.rune_count("漢é")); kaku data: []uint8 = [uint8(255)]; chant(string.from_utf8(data) == mu);',
    stdout: '2\nhai\n',
  },
  'kiso/utf8': {
    source: "kaku data: []uint8 = [uint8(255)]; chant(utf8.valid(utf8.encode_rune('漢'))); chant(utf8.valid(data));",
    stdout: 'hai\niie\n',
  },
};

export const deniedModules = ['kiso/fs', 'kiso/io', 'kiso/os', 'kiso/net', 'kiso/net/tcp', 'kiso/testing', 'kiso/runtime', 'kiso/aot/sign', 'kiso/encoding/mochi'];
