Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region src/zlib/trees.mjs
var Z_FIXED = 4;
var Z_BINARY = 0;
var Z_TEXT = 1;
var Z_UNKNOWN = 2;
function zero$1(buf) {
	let len = buf.length;
	while (--len >= 0) buf[len] = 0;
}
var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES = 2;
var LENGTH_CODES = 29;
var LITERALS = 256;
var L_CODES = 286;
var D_CODES = 30;
var BL_CODES = 19;
var HEAP_SIZE$1 = 573;
var MAX_BITS = 15;
var Buf_size = 16;
var MAX_BL_BITS = 7;
var END_BLOCK = 256;
var REP_3_6 = 16;
var REPZ_3_10 = 17;
var REPZ_11_138 = 18;
var extra_lbits = new Uint8Array([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	1,
	1,
	1,
	2,
	2,
	2,
	2,
	3,
	3,
	3,
	3,
	4,
	4,
	4,
	4,
	5,
	5,
	5,
	5,
	0
]);
var extra_dbits = new Uint8Array([
	0,
	0,
	0,
	0,
	1,
	1,
	2,
	2,
	3,
	3,
	4,
	4,
	5,
	5,
	6,
	6,
	7,
	7,
	8,
	8,
	9,
	9,
	10,
	10,
	11,
	11,
	12,
	12,
	13,
	13
]);
var extra_blbits = new Uint8Array([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	2,
	3,
	7
]);
var bl_order = new Uint8Array([
	16,
	17,
	18,
	0,
	8,
	7,
	9,
	6,
	10,
	5,
	11,
	4,
	12,
	3,
	13,
	2,
	14,
	1,
	15
]);
var DIST_CODE_LEN = 512;
var static_ltree = new Array(288 * 2);
zero$1(static_ltree);
var static_dtree = new Array(D_CODES * 2);
zero$1(static_dtree);
var _dist_code = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
var _length_code = new Array(256);
zero$1(_length_code);
var base_length = new Array(LENGTH_CODES);
zero$1(base_length);
var base_dist = new Array(D_CODES);
zero$1(base_dist);
var StaticTreeDesc = class {
	constructor(static_tree, extra_bits, extra_base, elems, max_length) {
		this.static_tree = static_tree;
		this.extra_bits = extra_bits;
		this.extra_base = extra_base;
		this.elems = elems;
		this.max_length = max_length;
		this.has_stree = static_tree && static_tree.length;
	}
};
var static_l_desc;
var static_d_desc;
var static_bl_desc;
var TreeDesc = class {
	constructor(dyn_tree, stat_desc) {
		this.dyn_tree = dyn_tree;
		this.max_code = 0;
		this.stat_desc = stat_desc;
	}
};
var d_code = (dist) => {
	return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
};
var put_short = (s, w) => {
	s.pending_buf[s.pending++] = w & 255;
	s.pending_buf[s.pending++] = w >>> 8 & 255;
};
var send_bits = (s, value, length) => {
	if (s.bi_valid > Buf_size - length) {
		s.bi_buf |= value << s.bi_valid & 65535;
		put_short(s, s.bi_buf);
		s.bi_buf = value >> Buf_size - s.bi_valid;
		s.bi_valid += length - Buf_size;
	} else {
		s.bi_buf |= value << s.bi_valid & 65535;
		s.bi_valid += length;
	}
};
var send_code = (s, c, tree) => {
	send_bits(s, tree[c * 2], tree[c * 2 + 1]);
};
var bi_reverse = (code, len) => {
	let res = 0;
	do {
		res |= code & 1;
		code >>>= 1;
		res <<= 1;
	} while (--len > 0);
	return res >>> 1;
};
var bi_flush = (s) => {
	if (s.bi_valid === 16) {
		put_short(s, s.bi_buf);
		s.bi_buf = 0;
		s.bi_valid = 0;
	} else if (s.bi_valid >= 8) {
		s.pending_buf[s.pending++] = s.bi_buf & 255;
		s.bi_buf >>= 8;
		s.bi_valid -= 8;
	}
};
var gen_bitlen = (s, desc) => {
	const tree = desc.dyn_tree;
	const max_code = desc.max_code;
	const stree = desc.stat_desc.static_tree;
	const has_stree = desc.stat_desc.has_stree;
	const extra = desc.stat_desc.extra_bits;
	const base = desc.stat_desc.extra_base;
	const max_length = desc.stat_desc.max_length;
	let h;
	let n, m;
	let bits;
	let xbits;
	let f;
	let overflow = 0;
	for (bits = 0; bits <= MAX_BITS; bits++) s.bl_count[bits] = 0;
	tree[s.heap[s.heap_max] * 2 + 1] = 0;
	for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
		n = s.heap[h];
		bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
		if (bits > max_length) {
			bits = max_length;
			overflow++;
		}
		tree[n * 2 + 1] = bits;
		if (n > max_code) continue;
		s.bl_count[bits]++;
		xbits = 0;
		if (n >= base) xbits = extra[n - base];
		f = tree[n * 2];
		s.opt_len += f * (bits + xbits);
		if (has_stree) s.static_len += f * (stree[n * 2 + 1] + xbits);
	}
	if (overflow === 0) return;
	do {
		bits = max_length - 1;
		while (s.bl_count[bits] === 0) bits--;
		s.bl_count[bits]--;
		s.bl_count[bits + 1] += 2;
		s.bl_count[max_length]--;
		overflow -= 2;
	} while (overflow > 0);
	for (bits = max_length; bits !== 0; bits--) {
		n = s.bl_count[bits];
		while (n !== 0) {
			m = s.heap[--h];
			if (m > max_code) continue;
			if (tree[m * 2 + 1] !== bits) {
				s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
				tree[m * 2 + 1] = bits;
			}
			n--;
		}
	}
};
var gen_codes = (tree, max_code, bl_count) => {
	const next_code = new Array(16);
	let code = 0;
	let bits;
	let n;
	for (bits = 1; bits <= MAX_BITS; bits++) {
		code = code + bl_count[bits - 1] << 1;
		next_code[bits] = code;
	}
	for (n = 0; n <= max_code; n++) {
		let len = tree[n * 2 + 1];
		if (len === 0) continue;
		tree[n * 2] = bi_reverse(next_code[len]++, len);
	}
};
var tr_static_init = () => {
	let n;
	let bits;
	let length;
	let code;
	let dist;
	const bl_count = new Array(16);
	length = 0;
	for (code = 0; code < LENGTH_CODES - 1; code++) {
		base_length[code] = length;
		for (n = 0; n < 1 << extra_lbits[code]; n++) _length_code[length++] = code;
	}
	_length_code[length - 1] = code;
	dist = 0;
	for (code = 0; code < 16; code++) {
		base_dist[code] = dist;
		for (n = 0; n < 1 << extra_dbits[code]; n++) _dist_code[dist++] = code;
	}
	dist >>= 7;
	for (; code < D_CODES; code++) {
		base_dist[code] = dist << 7;
		for (n = 0; n < 1 << extra_dbits[code] - 7; n++) _dist_code[256 + dist++] = code;
	}
	for (bits = 0; bits <= MAX_BITS; bits++) bl_count[bits] = 0;
	n = 0;
	while (n <= 143) {
		static_ltree[n * 2 + 1] = 8;
		n++;
		bl_count[8]++;
	}
	while (n <= 255) {
		static_ltree[n * 2 + 1] = 9;
		n++;
		bl_count[9]++;
	}
	while (n <= 279) {
		static_ltree[n * 2 + 1] = 7;
		n++;
		bl_count[7]++;
	}
	while (n <= 287) {
		static_ltree[n * 2 + 1] = 8;
		n++;
		bl_count[8]++;
	}
	gen_codes(static_ltree, 287, bl_count);
	for (n = 0; n < D_CODES; n++) {
		static_dtree[n * 2 + 1] = 5;
		static_dtree[n * 2] = bi_reverse(n, 5);
	}
	static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, 257, L_CODES, MAX_BITS);
	static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
	static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
};
var init_block = (s) => {
	let n;
	for (n = 0; n < L_CODES; n++) s.dyn_ltree[n * 2] = 0;
	for (n = 0; n < D_CODES; n++) s.dyn_dtree[n * 2] = 0;
	for (n = 0; n < BL_CODES; n++) s.bl_tree[n * 2] = 0;
	s.dyn_ltree[END_BLOCK * 2] = 1;
	s.opt_len = s.static_len = 0;
	s.sym_next = s.matches = 0;
};
var bi_windup = (s) => {
	if (s.bi_valid > 8) put_short(s, s.bi_buf);
	else if (s.bi_valid > 0) s.pending_buf[s.pending++] = s.bi_buf;
	s.bi_buf = 0;
	s.bi_valid = 0;
};
var smaller = (tree, n, m, depth) => {
	const _n2 = n * 2;
	const _m2 = m * 2;
	return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
};
var pqdownheap = (s, tree, k) => {
	const v = s.heap[k];
	let j = k << 1;
	while (j <= s.heap_len) {
		if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) j++;
		if (smaller(tree, v, s.heap[j], s.depth)) break;
		s.heap[k] = s.heap[j];
		k = j;
		j <<= 1;
	}
	s.heap[k] = v;
};
var compress_block = (s, ltree, dtree) => {
	let dist;
	let lc;
	let sx = 0;
	let code;
	let extra;
	if (s.sym_next !== 0) do {
		dist = s.pending_buf[s.sym_buf + sx++] & 255;
		dist += (s.pending_buf[s.sym_buf + sx++] & 255) << 8;
		lc = s.pending_buf[s.sym_buf + sx++];
		if (dist === 0) send_code(s, lc, ltree);
		else {
			code = _length_code[lc];
			send_code(s, code + LITERALS + 1, ltree);
			extra = extra_lbits[code];
			if (extra !== 0) {
				lc -= base_length[code];
				send_bits(s, lc, extra);
			}
			dist--;
			code = d_code(dist);
			send_code(s, code, dtree);
			extra = extra_dbits[code];
			if (extra !== 0) {
				dist -= base_dist[code];
				send_bits(s, dist, extra);
			}
		}
	} while (sx < s.sym_next);
	send_code(s, END_BLOCK, ltree);
};
var build_tree = (s, desc) => {
	const tree = desc.dyn_tree;
	const stree = desc.stat_desc.static_tree;
	const has_stree = desc.stat_desc.has_stree;
	const elems = desc.stat_desc.elems;
	let n, m;
	let max_code = -1;
	let node;
	s.heap_len = 0;
	s.heap_max = HEAP_SIZE$1;
	for (n = 0; n < elems; n++) if (tree[n * 2] !== 0) {
		s.heap[++s.heap_len] = max_code = n;
		s.depth[n] = 0;
	} else tree[n * 2 + 1] = 0;
	while (s.heap_len < 2) {
		node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
		tree[node * 2] = 1;
		s.depth[node] = 0;
		s.opt_len--;
		if (has_stree) s.static_len -= stree[node * 2 + 1];
	}
	desc.max_code = max_code;
	for (n = s.heap_len >> 1; n >= 1; n--) pqdownheap(s, tree, n);
	node = elems;
	do {
		/*** pqremove ***/
		n = s.heap[1];
		s.heap[1] = s.heap[s.heap_len--];
		pqdownheap(s, tree, 1);
		m = s.heap[1];
		s.heap[--s.heap_max] = n;
		s.heap[--s.heap_max] = m;
		tree[node * 2] = tree[n * 2] + tree[m * 2];
		s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
		tree[n * 2 + 1] = tree[m * 2 + 1] = node;
		s.heap[1] = node++;
		pqdownheap(s, tree, 1);
	} while (s.heap_len >= 2);
	s.heap[--s.heap_max] = s.heap[1];
	gen_bitlen(s, desc);
	gen_codes(tree, max_code, s.bl_count);
};
var scan_tree = (s, tree, max_code) => {
	let n;
	let prevlen = -1;
	let curlen;
	let nextlen = tree[1];
	let count = 0;
	let max_count = 7;
	let min_count = 4;
	if (nextlen === 0) {
		max_count = 138;
		min_count = 3;
	}
	tree[(max_code + 1) * 2 + 1] = 65535;
	for (n = 0; n <= max_code; n++) {
		curlen = nextlen;
		nextlen = tree[(n + 1) * 2 + 1];
		if (++count < max_count && curlen === nextlen) continue;
		else if (count < min_count) s.bl_tree[curlen * 2] += count;
		else if (curlen !== 0) {
			if (curlen !== prevlen) s.bl_tree[curlen * 2]++;
			s.bl_tree[REP_3_6 * 2]++;
		} else if (count <= 10) s.bl_tree[REPZ_3_10 * 2]++;
		else s.bl_tree[REPZ_11_138 * 2]++;
		count = 0;
		prevlen = curlen;
		if (nextlen === 0) {
			max_count = 138;
			min_count = 3;
		} else if (curlen === nextlen) {
			max_count = 6;
			min_count = 3;
		} else {
			max_count = 7;
			min_count = 4;
		}
	}
};
var send_tree = (s, tree, max_code) => {
	let n;
	let prevlen = -1;
	let curlen;
	let nextlen = tree[1];
	let count = 0;
	let max_count = 7;
	let min_count = 4;
	if (nextlen === 0) {
		max_count = 138;
		min_count = 3;
	}
	for (n = 0; n <= max_code; n++) {
		curlen = nextlen;
		nextlen = tree[(n + 1) * 2 + 1];
		if (++count < max_count && curlen === nextlen) continue;
		else if (count < min_count) do
			send_code(s, curlen, s.bl_tree);
		while (--count !== 0);
		else if (curlen !== 0) {
			if (curlen !== prevlen) {
				send_code(s, curlen, s.bl_tree);
				count--;
			}
			send_code(s, REP_3_6, s.bl_tree);
			send_bits(s, count - 3, 2);
		} else if (count <= 10) {
			send_code(s, REPZ_3_10, s.bl_tree);
			send_bits(s, count - 3, 3);
		} else {
			send_code(s, REPZ_11_138, s.bl_tree);
			send_bits(s, count - 11, 7);
		}
		count = 0;
		prevlen = curlen;
		if (nextlen === 0) {
			max_count = 138;
			min_count = 3;
		} else if (curlen === nextlen) {
			max_count = 6;
			min_count = 3;
		} else {
			max_count = 7;
			min_count = 4;
		}
	}
};
var build_bl_tree = (s) => {
	let max_blindex;
	scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
	scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
	build_tree(s, s.bl_desc);
	for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) break;
	s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
	return max_blindex;
};
var send_all_trees = (s, lcodes, dcodes, blcodes) => {
	let rank;
	send_bits(s, lcodes - 257, 5);
	send_bits(s, dcodes - 1, 5);
	send_bits(s, blcodes - 4, 4);
	for (rank = 0; rank < blcodes; rank++) send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
	send_tree(s, s.dyn_ltree, lcodes - 1);
	send_tree(s, s.dyn_dtree, dcodes - 1);
};
var detect_data_type = (s) => {
	let block_mask = 4093624447;
	let n;
	for (n = 0; n <= 31; n++, block_mask >>>= 1) if (block_mask & 1 && s.dyn_ltree[n * 2] !== 0) return Z_BINARY;
	if (s.dyn_ltree[18] !== 0 || s.dyn_ltree[20] !== 0 || s.dyn_ltree[26] !== 0) return Z_TEXT;
	for (n = 32; n < LITERALS; n++) if (s.dyn_ltree[n * 2] !== 0) return Z_TEXT;
	return Z_BINARY;
};
var static_init_done = false;
var _tr_init = (s) => {
	if (!static_init_done) {
		tr_static_init();
		static_init_done = true;
	}
	s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
	s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
	s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
	s.bi_buf = 0;
	s.bi_valid = 0;
	init_block(s);
};
var _tr_stored_block = (s, buf, stored_len, last) => {
	send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
	bi_windup(s);
	put_short(s, stored_len);
	put_short(s, ~stored_len);
	if (stored_len) s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
	s.pending += stored_len;
};
var _tr_align = (s) => {
	send_bits(s, STATIC_TREES << 1, 3);
	send_code(s, END_BLOCK, static_ltree);
	bi_flush(s);
};
var _tr_flush_block = (s, buf, stored_len, last) => {
	let opt_lenb, static_lenb;
	let max_blindex = 0;
	if (s.level > 0) {
		if (s.strm.data_type === Z_UNKNOWN) s.strm.data_type = detect_data_type(s);
		build_tree(s, s.l_desc);
		build_tree(s, s.d_desc);
		max_blindex = build_bl_tree(s);
		opt_lenb = s.opt_len + 3 + 7 >>> 3;
		static_lenb = s.static_len + 3 + 7 >>> 3;
		if (static_lenb <= opt_lenb) opt_lenb = static_lenb;
	} else opt_lenb = static_lenb = stored_len + 5;
	if (stored_len + 4 <= opt_lenb && buf !== -1) _tr_stored_block(s, buf, stored_len, last);
	else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
		send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
		compress_block(s, static_ltree, static_dtree);
	} else {
		send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
		send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
		compress_block(s, s.dyn_ltree, s.dyn_dtree);
	}
	init_block(s);
	if (last) bi_windup(s);
};
var _tr_tally = (s, dist, lc) => {
	s.pending_buf[s.sym_buf + s.sym_next++] = dist;
	s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
	s.pending_buf[s.sym_buf + s.sym_next++] = lc;
	if (dist === 0) s.dyn_ltree[lc * 2]++;
	else {
		s.matches++;
		dist--;
		s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
		s.dyn_dtree[d_code(dist) * 2]++;
	}
	return s.sym_next === s.sym_end;
};
//#endregion
//#region src/zlib/adler32.mjs
var adler32 = (adler, buf, len, pos) => {
	let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
	while (len !== 0) {
		n = len > 2e3 ? 2e3 : len;
		len -= n;
		do {
			s1 = s1 + buf[pos++] | 0;
			s2 = s2 + s1 | 0;
		} while (--n);
		s1 %= 65521;
		s2 %= 65521;
	}
	return s1 | s2 << 16 | 0;
};
//#endregion
//#region src/zlib/crc32.mjs
var makeTable = () => {
	let c, table = [];
	for (var n = 0; n < 256; n++) {
		c = n;
		for (var k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
		table[n] = c;
	}
	return table;
};
var crcTable = new Uint32Array(makeTable());
var crc32 = (crc, buf, len, pos) => {
	const t = crcTable;
	const end = pos + len;
	crc ^= -1;
	for (let i = pos; i < end; i++) crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
	return crc ^ -1;
};
//#endregion
//#region src/zlib/messages.mjs
var messages_default = {
	2: "need dictionary",
	1: "stream end",
	0: "",
	"-1": "file error",
	"-2": "stream error",
	"-3": "data error",
	"-4": "insufficient memory",
	"-5": "buffer error",
	"-6": "incompatible version"
};
//#endregion
//#region src/zlib/constants.mjs
var Z_NO_FLUSH = 0;
var Z_PARTIAL_FLUSH = 1;
var Z_SYNC_FLUSH = 2;
var Z_FULL_FLUSH = 3;
var Z_FINISH = 4;
var Z_BLOCK = 5;
var Z_TREES = 6;
var Z_OK = 0;
var Z_STREAM_END = 1;
var Z_NEED_DICT = 2;
var Z_ERRNO = -1;
var Z_STREAM_ERROR = -2;
var Z_DATA_ERROR = -3;
var Z_MEM_ERROR = -4;
var Z_BUF_ERROR = -5;
//#endregion
//#region src/zlib/deflate.mjs
var MAX_MEM_LEVEL = 9;
var MAX_WBITS = 15;
var DEF_MEM_LEVEL = 8;
var HEAP_SIZE = 573;
var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = 262;
var PRESET_DICT = 32;
var INIT_STATE = 42;
var GZIP_STATE = 57;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;
var BS_NEED_MORE = 1;
var BS_BLOCK_DONE = 2;
var BS_FINISH_STARTED = 3;
var BS_FINISH_DONE = 4;
var OS_CODE = 3;
var err = (strm, errorCode) => {
	strm.msg = messages_default[errorCode];
	return errorCode;
};
var rank = (f) => {
	return f * 2 - (f > 4 ? 9 : 0);
};
var zero = (buf) => {
	let len = buf.length;
	while (--len >= 0) buf[len] = 0;
};
var slide_hash = (s) => {
	let n, m;
	let p;
	let wsize = s.w_size;
	n = s.hash_size;
	p = n;
	do {
		m = s.head[--p];
		s.head[p] = m >= wsize ? m - wsize : 0;
	} while (--n);
	n = wsize;
	p = n;
	do {
		m = s.prev[--p];
		s.prev[p] = m >= wsize ? m - wsize : 0;
	} while (--n);
};
var HASH = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask;
var INSERT_STRING = (s, str) => {
	let h;
	if (s.legacy_hash) h = s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
	else {
		const w = s.window;
		const value = w[str] | w[str + 1] << 8 | w[str + 2] << 16 | w[str + 3] << 24;
		h = s.ins_h = Math.imul(value, 66521) + 66521 >>> 16 & s.hash_mask;
	}
	const hash_head = s.prev[str & s.w_mask] = s.head[h];
	s.head[h] = str;
	return hash_head;
};
var flush_pending = (strm) => {
	const s = strm.state;
	let len = s.pending;
	if (len > strm.avail_out) len = strm.avail_out;
	if (len === 0) return;
	strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
	strm.next_out += len;
	s.pending_out += len;
	strm.total_out += len;
	strm.avail_out -= len;
	s.pending -= len;
	if (s.pending === 0) s.pending_out = 0;
};
var flush_block_only = (s, last) => {
	_tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
	s.block_start = s.strstart;
	flush_pending(s.strm);
};
var put_byte = (s, b) => {
	s.pending_buf[s.pending++] = b;
};
var putShortMSB = (s, b) => {
	s.pending_buf[s.pending++] = b >>> 8 & 255;
	s.pending_buf[s.pending++] = b & 255;
};
var read_buf = (strm, buf, start, size) => {
	let len = strm.avail_in;
	if (len > size) len = size;
	if (len === 0) return 0;
	strm.avail_in -= len;
	buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
	if (strm.state.wrap === 1) strm.adler = adler32(strm.adler, buf, len, start);
	else if (strm.state.wrap === 2) strm.adler = crc32(strm.adler, buf, len, start);
	strm.next_in += len;
	strm.total_in += len;
	return len;
};
var longest_match = (s, cur_match) => {
	let chain_length = s.max_chain_length;
	let scan = s.strstart;
	let match;
	let len;
	let best_len = s.prev_length;
	let nice_match = s.nice_match;
	const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
	const _win = s.window;
	const wmask = s.w_mask;
	const prev = s.prev;
	const strend = s.strstart + MAX_MATCH;
	let scan_end1 = _win[scan + best_len - 1];
	let scan_end = _win[scan + best_len];
	if (s.prev_length >= s.good_match) chain_length >>= 2;
	if (nice_match > s.lookahead) nice_match = s.lookahead;
	do {
		match = cur_match;
		if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) continue;
		scan += 2;
		match++;
		do		;
while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
		len = MAX_MATCH - (strend - scan);
		scan = strend - MAX_MATCH;
		if (len > best_len) {
			s.match_start = cur_match;
			best_len = len;
			if (len >= nice_match) break;
			scan_end1 = _win[scan + best_len - 1];
			scan_end = _win[scan + best_len];
		}
	} while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
	if (best_len <= s.lookahead) return best_len;
	return s.lookahead;
};
var fill_window = (s) => {
	const _w_size = s.w_size;
	let n, more, str;
	do {
		more = s.window_size - s.lookahead - s.strstart;
		if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
			s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
			s.match_start -= _w_size;
			s.strstart -= _w_size;
			s.block_start -= _w_size;
			if (s.insert > s.strstart) s.insert = s.strstart;
			slide_hash(s);
			more += _w_size;
		}
		if (s.strm.avail_in === 0) break;
		n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
		s.lookahead += n;
		if (!s.legacy_hash) {
			if (s.lookahead + s.insert > MIN_MATCH) {
				str = s.strstart - s.insert;
				while (s.insert) {
					INSERT_STRING(s, str);
					str++;
					s.insert--;
					if (s.lookahead + s.insert <= MIN_MATCH) break;
				}
			}
		} else if (s.lookahead + s.insert >= MIN_MATCH) {
			str = s.strstart - s.insert;
			s.ins_h = s.window[str];
			s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
			while (s.insert) {
				INSERT_STRING(s, str);
				str++;
				s.insert--;
				if (s.lookahead + s.insert < MIN_MATCH) break;
			}
		}
	} while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
};
var deflate_stored = (s, flush) => {
	let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
	let len, left, have, last = 0;
	let used = s.strm.avail_in;
	do {
		len = 65535;
		have = s.bi_valid + 42 >> 3;
		if (s.strm.avail_out < have) break;
		have = s.strm.avail_out - have;
		left = s.strstart - s.block_start;
		if (len > left + s.strm.avail_in) len = left + s.strm.avail_in;
		if (len > have) len = have;
		if (len < min_block && (len === 0 && flush !== 4 || flush === 0 || len !== left + s.strm.avail_in)) break;
		last = flush === 4 && len === left + s.strm.avail_in ? 1 : 0;
		_tr_stored_block(s, 0, 0, last);
		s.pending_buf[s.pending - 4] = len;
		s.pending_buf[s.pending - 3] = len >> 8;
		s.pending_buf[s.pending - 2] = ~len;
		s.pending_buf[s.pending - 1] = ~len >> 8;
		flush_pending(s.strm);
		if (left) {
			if (left > len) left = len;
			s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
			s.strm.next_out += left;
			s.strm.avail_out -= left;
			s.strm.total_out += left;
			s.block_start += left;
			len -= left;
		}
		if (len) {
			read_buf(s.strm, s.strm.output, s.strm.next_out, len);
			s.strm.next_out += len;
			s.strm.avail_out -= len;
			s.strm.total_out += len;
		}
	} while (last === 0);
	used -= s.strm.avail_in;
	if (used) {
		if (used >= s.w_size) {
			s.matches = 2;
			s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
			s.strstart = s.w_size;
			s.insert = s.strstart;
		} else {
			if (s.window_size - s.strstart <= used) {
				s.strstart -= s.w_size;
				s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
				if (s.matches < 2) s.matches++;
				if (s.insert > s.strstart) s.insert = s.strstart;
			}
			s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
			s.strstart += used;
			s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
		}
		s.block_start = s.strstart;
	}
	if (s.high_water < s.strstart) s.high_water = s.strstart;
	if (last) return BS_FINISH_DONE;
	if (flush !== 0 && flush !== 4 && s.strm.avail_in === 0 && s.strstart === s.block_start) return BS_BLOCK_DONE;
	have = s.window_size - s.strstart;
	if (s.strm.avail_in > have && s.block_start >= s.w_size) {
		s.block_start -= s.w_size;
		s.strstart -= s.w_size;
		s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
		if (s.matches < 2) s.matches++;
		have += s.w_size;
		if (s.insert > s.strstart) s.insert = s.strstart;
	}
	if (have > s.strm.avail_in) have = s.strm.avail_in;
	if (have) {
		read_buf(s.strm, s.window, s.strstart, have);
		s.strstart += have;
		s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
	}
	if (s.high_water < s.strstart) s.high_water = s.strstart;
	have = s.bi_valid + 42 >> 3;
	have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
	min_block = have > s.w_size ? s.w_size : have;
	left = s.strstart - s.block_start;
	if (left >= min_block || (left || flush === 4) && flush !== 0 && s.strm.avail_in === 0 && left <= have) {
		len = left > have ? have : left;
		last = flush === 4 && s.strm.avail_in === 0 && len === left ? 1 : 0;
		_tr_stored_block(s, s.block_start, len, last);
		s.block_start += len;
		flush_pending(s.strm);
	}
	return last ? BS_FINISH_STARTED : BS_NEED_MORE;
};
var deflate_fast = (s, flush) => {
	let hash_head;
	let bflush;
	for (;;) {
		if (s.lookahead < MIN_LOOKAHEAD) {
			fill_window(s);
			if (s.lookahead < MIN_LOOKAHEAD && flush === 0) return BS_NEED_MORE;
			if (s.lookahead === 0) break;
		}
		hash_head = 0;
		if (s.lookahead >= MIN_MATCH) hash_head = INSERT_STRING(s, s.strstart);
		if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) s.match_length = longest_match(s, hash_head);
		if (s.match_length >= MIN_MATCH) {
			/*** _tr_tally_dist(s, s.strstart - s.match_start,
			s.match_length - MIN_MATCH, bflush); ***/
			bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
			s.lookahead -= s.match_length;
			if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
				s.match_length--;
				do {
					s.strstart++;
					hash_head = INSERT_STRING(s, s.strstart);
				} while (--s.match_length !== 0);
				s.strstart++;
			} else {
				s.strstart += s.match_length;
				s.match_length = 0;
				if (s.legacy_hash) {
					s.ins_h = s.window[s.strstart];
					s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
				}
			}
		} else {
			/*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
			bflush = _tr_tally(s, 0, s.window[s.strstart]);
			s.lookahead--;
			s.strstart++;
		}
		if (bflush) {
			/*** FLUSH_BLOCK(s, 0); ***/
			flush_block_only(s, false);
			if (s.strm.avail_out === 0) return BS_NEED_MORE;
		}
	}
	s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
	if (flush === 4) {
		/*** FLUSH_BLOCK(s, 1); ***/
		flush_block_only(s, true);
		if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
		return BS_FINISH_DONE;
	}
	if (s.sym_next) {
		/*** FLUSH_BLOCK(s, 0); ***/
		flush_block_only(s, false);
		if (s.strm.avail_out === 0) return BS_NEED_MORE;
	}
	return BS_BLOCK_DONE;
};
var deflate_slow = (s, flush) => {
	let hash_head;
	let bflush;
	let max_insert;
	for (;;) {
		if (s.lookahead < MIN_LOOKAHEAD) {
			fill_window(s);
			if (s.lookahead < MIN_LOOKAHEAD && flush === 0) return BS_NEED_MORE;
			if (s.lookahead === 0) break;
		}
		hash_head = 0;
		if (s.lookahead >= MIN_MATCH) hash_head = INSERT_STRING(s, s.strstart);
		s.prev_length = s.match_length;
		s.prev_match = s.match_start;
		s.match_length = MIN_MATCH - 1;
		if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
			s.match_length = longest_match(s, hash_head);
			if (s.match_length <= 5 && (s.strategy === 1 || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) s.match_length = MIN_MATCH - 1;
		}
		if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
			max_insert = s.strstart + s.lookahead - MIN_MATCH;
			/***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
			s.prev_length - MIN_MATCH, bflush);***/
			bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
			s.lookahead -= s.prev_length - 1;
			s.prev_length -= 2;
			do
				if (++s.strstart <= max_insert) hash_head = INSERT_STRING(s, s.strstart);
			while (--s.prev_length !== 0);
			s.match_available = 0;
			s.match_length = MIN_MATCH - 1;
			s.strstart++;
			if (bflush) {
				/*** FLUSH_BLOCK(s, 0); ***/
				flush_block_only(s, false);
				if (s.strm.avail_out === 0) return BS_NEED_MORE;
			}
		} else if (s.match_available) {
			/*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
			bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
			if (bflush)
 /*** FLUSH_BLOCK_ONLY(s, 0) ***/
			flush_block_only(s, false);
			s.strstart++;
			s.lookahead--;
			if (s.strm.avail_out === 0) return BS_NEED_MORE;
		} else {
			s.match_available = 1;
			s.strstart++;
			s.lookahead--;
		}
	}
	if (s.match_available) {
		/*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
		bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
		s.match_available = 0;
	}
	s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
	if (flush === 4) {
		/*** FLUSH_BLOCK(s, 1); ***/
		flush_block_only(s, true);
		if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
		return BS_FINISH_DONE;
	}
	if (s.sym_next) {
		/*** FLUSH_BLOCK(s, 0); ***/
		flush_block_only(s, false);
		if (s.strm.avail_out === 0) return BS_NEED_MORE;
	}
	return BS_BLOCK_DONE;
};
var deflate_rle = (s, flush) => {
	let bflush;
	let prev;
	let scan, strend;
	const _win = s.window;
	for (;;) {
		if (s.lookahead <= MAX_MATCH) {
			fill_window(s);
			if (s.lookahead <= MAX_MATCH && flush === 0) return BS_NEED_MORE;
			if (s.lookahead === 0) break;
		}
		s.match_length = 0;
		if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
			scan = s.strstart - 1;
			prev = _win[scan];
			if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
				strend = s.strstart + MAX_MATCH;
				do				;
while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
				s.match_length = MAX_MATCH - (strend - scan);
				if (s.match_length > s.lookahead) s.match_length = s.lookahead;
			}
		}
		if (s.match_length >= MIN_MATCH) {
			/*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
			bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
			s.lookahead -= s.match_length;
			s.strstart += s.match_length;
			s.match_length = 0;
		} else {
			/*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
			bflush = _tr_tally(s, 0, s.window[s.strstart]);
			s.lookahead--;
			s.strstart++;
		}
		if (bflush) {
			/*** FLUSH_BLOCK(s, 0); ***/
			flush_block_only(s, false);
			if (s.strm.avail_out === 0) return BS_NEED_MORE;
		}
	}
	s.insert = 0;
	if (flush === 4) {
		/*** FLUSH_BLOCK(s, 1); ***/
		flush_block_only(s, true);
		if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
		return BS_FINISH_DONE;
	}
	if (s.sym_next) {
		/*** FLUSH_BLOCK(s, 0); ***/
		flush_block_only(s, false);
		if (s.strm.avail_out === 0) return BS_NEED_MORE;
	}
	return BS_BLOCK_DONE;
};
var deflate_huff = (s, flush) => {
	let bflush;
	for (;;) {
		if (s.lookahead === 0) {
			fill_window(s);
			if (s.lookahead === 0) {
				if (flush === 0) return BS_NEED_MORE;
				break;
			}
		}
		s.match_length = 0;
		/*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
		bflush = _tr_tally(s, 0, s.window[s.strstart]);
		s.lookahead--;
		s.strstart++;
		if (bflush) {
			/*** FLUSH_BLOCK(s, 0); ***/
			flush_block_only(s, false);
			if (s.strm.avail_out === 0) return BS_NEED_MORE;
		}
	}
	s.insert = 0;
	if (flush === 4) {
		/*** FLUSH_BLOCK(s, 1); ***/
		flush_block_only(s, true);
		if (s.strm.avail_out === 0) return BS_FINISH_STARTED;
		return BS_FINISH_DONE;
	}
	if (s.sym_next) {
		/*** FLUSH_BLOCK(s, 0); ***/
		flush_block_only(s, false);
		if (s.strm.avail_out === 0) return BS_NEED_MORE;
	}
	return BS_BLOCK_DONE;
};
var Config = class {
	constructor(good_length, max_lazy, nice_length, max_chain, func) {
		this.good_length = good_length;
		this.max_lazy = max_lazy;
		this.nice_length = nice_length;
		this.max_chain = max_chain;
		this.func = func;
	}
};
var configuration_table = [
	new Config(0, 0, 0, 0, deflate_stored),
	new Config(4, 4, 8, 4, deflate_fast),
	new Config(4, 5, 16, 8, deflate_fast),
	new Config(4, 6, 32, 32, deflate_fast),
	new Config(4, 4, 16, 16, deflate_slow),
	new Config(8, 16, 32, 32, deflate_slow),
	new Config(8, 16, 128, 128, deflate_slow),
	new Config(8, 32, 128, 256, deflate_slow),
	new Config(32, 128, 258, 1024, deflate_slow),
	new Config(32, 258, 258, 4096, deflate_slow)
];
var lm_init = (s) => {
	s.window_size = 2 * s.w_size;
	/*** CLEAR_HASH(s); ***/
	zero(s.head);
	s.max_lazy_match = configuration_table[s.level].max_lazy;
	s.good_match = configuration_table[s.level].good_length;
	s.nice_match = configuration_table[s.level].nice_length;
	s.max_chain_length = configuration_table[s.level].max_chain;
	s.strstart = 0;
	s.block_start = 0;
	s.lookahead = 0;
	s.insert = 0;
	s.match_length = s.prev_length = MIN_MATCH - 1;
	s.match_available = 0;
	s.ins_h = 0;
};
var DeflateState = class {
	constructor() {
		this.strm = null;
		this.status = 0;
		this.pending_buf = null;
		this.pending_buf_size = 0;
		this.pending_out = 0;
		this.pending = 0;
		this.wrap = 0;
		this.gzhead = null;
		this.gzindex = 0;
		this.method = 8;
		this.last_flush = -1;
		this.w_size = 0;
		this.w_bits = 0;
		this.w_mask = 0;
		this.window = null;
		this.window_size = 0;
		this.prev = null;
		this.head = null;
		this.ins_h = 0;
		this.legacy_hash = 0;
		this.hash_size = 0;
		this.hash_bits = 0;
		this.hash_mask = 0;
		this.hash_shift = 0;
		this.block_start = 0;
		this.match_length = 0;
		this.prev_match = 0;
		this.match_available = 0;
		this.strstart = 0;
		this.match_start = 0;
		this.lookahead = 0;
		this.prev_length = 0;
		this.max_chain_length = 0;
		this.max_lazy_match = 0;
		this.level = 0;
		this.strategy = 0;
		this.good_match = 0;
		this.nice_match = 0;
		this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
		this.dyn_dtree = /* @__PURE__ */ new Uint16Array(122);
		this.bl_tree = /* @__PURE__ */ new Uint16Array(78);
		zero(this.dyn_ltree);
		zero(this.dyn_dtree);
		zero(this.bl_tree);
		this.l_desc = null;
		this.d_desc = null;
		this.bl_desc = null;
		this.bl_count = /* @__PURE__ */ new Uint16Array(16);
		this.heap = /* @__PURE__ */ new Uint16Array(573);
		zero(this.heap);
		this.heap_len = 0;
		this.heap_max = 0;
		this.depth = /* @__PURE__ */ new Uint16Array(573);
		zero(this.depth);
		this.sym_buf = 0;
		this.lit_bufsize = 0;
		this.sym_next = 0;
		this.sym_end = 0;
		this.opt_len = 0;
		this.static_len = 0;
		this.matches = 0;
		this.insert = 0;
		this.bi_buf = 0;
		this.bi_valid = 0;
	}
};
var deflateStateCheck = (strm) => {
	if (!strm) return 1;
	const s = strm.state;
	if (!s || s.strm !== strm || s.status !== INIT_STATE && s.status !== GZIP_STATE && s.status !== EXTRA_STATE && s.status !== NAME_STATE && s.status !== COMMENT_STATE && s.status !== HCRC_STATE && s.status !== BUSY_STATE && s.status !== FINISH_STATE) return 1;
	return 0;
};
var deflateResetKeep = (strm) => {
	if (deflateStateCheck(strm)) return err(strm, -2);
	strm.total_in = strm.total_out = 0;
	strm.data_type = 2;
	const s = strm.state;
	s.pending = 0;
	s.pending_out = 0;
	if (s.wrap < 0) s.wrap = -s.wrap;
	s.status = s.wrap === 2 ? GZIP_STATE : s.wrap ? INIT_STATE : BUSY_STATE;
	strm.adler = s.wrap === 2 ? 0 : 1;
	s.last_flush = -2;
	_tr_init(s);
	return 0;
};
var deflateReset = (strm) => {
	const ret = deflateResetKeep(strm);
	if (ret === 0) lm_init(strm.state);
	return ret;
};
var deflateSetHeader = (strm, head) => {
	if (deflateStateCheck(strm) || strm.state.wrap !== 2) return -2;
	strm.state.gzhead = head;
	return 0;
};
var deflateInit2 = (strm, level, method, windowBits, memLevel, strategy, legacyHash) => {
	if (!strm) return -2;
	let wrap = 1;
	if (level === -1) level = 6;
	if (windowBits < 0) {
		wrap = 0;
		windowBits = -windowBits;
	} else if (windowBits > 15) {
		wrap = 2;
		windowBits -= 16;
	}
	if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== 8 || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > 4 || windowBits === 8 && wrap !== 1) return err(strm, -2);
	if (windowBits === 8) windowBits = 9;
	const s = new DeflateState();
	strm.state = s;
	s.strm = strm;
	s.status = INIT_STATE;
	s.wrap = wrap;
	s.gzhead = null;
	s.w_bits = windowBits;
	s.w_size = 1 << s.w_bits;
	s.w_mask = s.w_size - 1;
	s.legacy_hash = legacyHash ? 1 : 0;
	s.hash_bits = memLevel + 7;
	if (!s.legacy_hash && s.hash_bits < 15) s.hash_bits = 15;
	s.hash_size = 1 << s.hash_bits;
	s.hash_mask = s.hash_size - 1;
	s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
	s.window = new Uint8Array(s.w_size * 2);
	s.head = new Uint16Array(s.hash_size);
	s.prev = new Uint16Array(s.w_size);
	s.lit_bufsize = 1 << memLevel + 6;
	s.pending_buf_size = s.lit_bufsize * 4;
	s.pending_buf = new Uint8Array(s.pending_buf_size);
	s.sym_buf = s.lit_bufsize;
	s.sym_end = (s.lit_bufsize - 1) * 3;
	s.level = level;
	s.strategy = strategy;
	s.method = method;
	return deflateReset(strm);
};
var deflateInit = (strm, level) => {
	return deflateInit2(strm, level, 8, MAX_WBITS, DEF_MEM_LEVEL, 0);
};
var deflate$1 = (strm, flush) => {
	if (deflateStateCheck(strm) || flush > 5 || flush < 0) return strm ? err(strm, -2) : -2;
	const s = strm.state;
	if (!strm.output || strm.avail_in !== 0 && !strm.input || s.status === FINISH_STATE && flush !== 4) return err(strm, strm.avail_out === 0 ? -5 : -2);
	const old_flush = s.last_flush;
	s.last_flush = flush;
	if (s.pending !== 0) {
		flush_pending(strm);
		if (strm.avail_out === 0) {
			s.last_flush = -1;
			return 0;
		}
	} else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== 4) return err(strm, -5);
	if (s.status === FINISH_STATE && strm.avail_in !== 0) return err(strm, -5);
	if (s.status === INIT_STATE && s.wrap === 0) s.status = BUSY_STATE;
	if (s.status === INIT_STATE) {
		let header = 8 + (s.w_bits - 8 << 4) << 8;
		let level_flags = -1;
		if (s.strategy >= 2 || s.level < 2) level_flags = 0;
		else if (s.level < 6) level_flags = 1;
		else if (s.level === 6) level_flags = 2;
		else level_flags = 3;
		header |= level_flags << 6;
		if (s.strstart !== 0) header |= PRESET_DICT;
		header += 31 - header % 31;
		putShortMSB(s, header);
		if (s.strstart !== 0) {
			putShortMSB(s, strm.adler >>> 16);
			putShortMSB(s, strm.adler & 65535);
		}
		strm.adler = 1;
		s.status = BUSY_STATE;
		flush_pending(strm);
		if (s.pending !== 0) {
			s.last_flush = -1;
			return 0;
		}
	}
	if (s.status === GZIP_STATE) {
		strm.adler = 0;
		put_byte(s, 31);
		put_byte(s, 139);
		put_byte(s, 8);
		if (!s.gzhead) {
			put_byte(s, 0);
			put_byte(s, 0);
			put_byte(s, 0);
			put_byte(s, 0);
			put_byte(s, 0);
			put_byte(s, s.level === 9 ? 2 : s.strategy >= 2 || s.level < 2 ? 4 : 0);
			put_byte(s, OS_CODE);
			s.status = BUSY_STATE;
			flush_pending(strm);
			if (s.pending !== 0) {
				s.last_flush = -1;
				return 0;
			}
		} else {
			put_byte(s, (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
			put_byte(s, s.gzhead.time & 255);
			put_byte(s, s.gzhead.time >> 8 & 255);
			put_byte(s, s.gzhead.time >> 16 & 255);
			put_byte(s, s.gzhead.time >> 24 & 255);
			put_byte(s, s.level === 9 ? 2 : s.strategy >= 2 || s.level < 2 ? 4 : 0);
			put_byte(s, s.gzhead.os & 255);
			if (s.gzhead.extra && s.gzhead.extra.length) {
				put_byte(s, s.gzhead.extra.length & 255);
				put_byte(s, s.gzhead.extra.length >> 8 & 255);
			}
			if (s.gzhead.hcrc) strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
			s.gzindex = 0;
			s.status = EXTRA_STATE;
		}
	}
	if (s.status === EXTRA_STATE) {
		if (s.gzhead.extra) {
			let beg = s.pending;
			let left = (s.gzhead.extra.length & 65535) - s.gzindex;
			while (s.pending + left > s.pending_buf_size) {
				let copy = s.pending_buf_size - s.pending;
				s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
				s.pending = s.pending_buf_size;
				if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
				s.gzindex += copy;
				flush_pending(strm);
				if (s.pending !== 0) {
					s.last_flush = -1;
					return 0;
				}
				beg = 0;
				left -= copy;
			}
			let gzhead_extra = new Uint8Array(s.gzhead.extra);
			s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
			s.pending += left;
			if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
			s.gzindex = 0;
		}
		s.status = NAME_STATE;
	}
	if (s.status === NAME_STATE) {
		if (s.gzhead.name) {
			let beg = s.pending;
			let val;
			do {
				if (s.pending === s.pending_buf_size) {
					if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
					flush_pending(strm);
					if (s.pending !== 0) {
						s.last_flush = -1;
						return 0;
					}
					beg = 0;
				}
				if (s.gzindex < s.gzhead.name.length) val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
				else val = 0;
				put_byte(s, val);
			} while (val !== 0);
			if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
			s.gzindex = 0;
		}
		s.status = COMMENT_STATE;
	}
	if (s.status === COMMENT_STATE) {
		if (s.gzhead.comment) {
			let beg = s.pending;
			let val;
			do {
				if (s.pending === s.pending_buf_size) {
					if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
					flush_pending(strm);
					if (s.pending !== 0) {
						s.last_flush = -1;
						return 0;
					}
					beg = 0;
				}
				if (s.gzindex < s.gzhead.comment.length) val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
				else val = 0;
				put_byte(s, val);
			} while (val !== 0);
			if (s.gzhead.hcrc && s.pending > beg) strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
		}
		s.status = HCRC_STATE;
	}
	if (s.status === HCRC_STATE) {
		if (s.gzhead.hcrc) {
			if (s.pending + 2 > s.pending_buf_size) {
				flush_pending(strm);
				if (s.pending !== 0) {
					s.last_flush = -1;
					return 0;
				}
			}
			put_byte(s, strm.adler & 255);
			put_byte(s, strm.adler >> 8 & 255);
			strm.adler = 0;
		}
		s.status = BUSY_STATE;
		flush_pending(strm);
		if (s.pending !== 0) {
			s.last_flush = -1;
			return 0;
		}
	}
	if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== 0 && s.status !== FINISH_STATE) {
		let bstate = s.level === 0 ? deflate_stored(s, flush) : s.strategy === 2 ? deflate_huff(s, flush) : s.strategy === 3 ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
		if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) s.status = FINISH_STATE;
		if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
			if (strm.avail_out === 0) s.last_flush = -1;
			return 0;
		}
		if (bstate === BS_BLOCK_DONE) {
			if (flush === 1) _tr_align(s);
			else if (flush !== 5) {
				_tr_stored_block(s, 0, 0, false);
				if (flush === 3) {
					/*** CLEAR_HASH(s); ***/ zero(s.head);
					if (s.lookahead === 0) {
						s.strstart = 0;
						s.block_start = 0;
						s.insert = 0;
					}
				}
			}
			flush_pending(strm);
			if (strm.avail_out === 0) {
				s.last_flush = -1;
				return 0;
			}
		}
	}
	if (flush !== 4) return 0;
	if (s.wrap <= 0) return 1;
	if (s.wrap === 2) {
		put_byte(s, strm.adler & 255);
		put_byte(s, strm.adler >> 8 & 255);
		put_byte(s, strm.adler >> 16 & 255);
		put_byte(s, strm.adler >> 24 & 255);
		put_byte(s, strm.total_in & 255);
		put_byte(s, strm.total_in >> 8 & 255);
		put_byte(s, strm.total_in >> 16 & 255);
		put_byte(s, strm.total_in >> 24 & 255);
	} else {
		putShortMSB(s, strm.adler >>> 16);
		putShortMSB(s, strm.adler & 65535);
	}
	flush_pending(strm);
	if (s.wrap > 0) s.wrap = -s.wrap;
	return s.pending !== 0 ? 0 : 1;
};
var deflateEnd = (strm) => {
	if (deflateStateCheck(strm)) return -2;
	const status = strm.state.status;
	strm.state = null;
	return status === BUSY_STATE ? err(strm, -3) : 0;
};
var deflateSetDictionary = (strm, dictionary) => {
	let dictLength = dictionary.length;
	if (deflateStateCheck(strm)) return -2;
	const s = strm.state;
	const wrap = s.wrap;
	if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) return -2;
	if (wrap === 1) strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
	s.wrap = 0;
	if (dictLength >= s.w_size) {
		if (wrap === 0) {
			/*** CLEAR_HASH(s); ***/
			zero(s.head);
			s.strstart = 0;
			s.block_start = 0;
			s.insert = 0;
		}
		let tmpDict = new Uint8Array(s.w_size);
		tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
		dictionary = tmpDict;
		dictLength = s.w_size;
	}
	const avail = strm.avail_in;
	const next = strm.next_in;
	const input = strm.input;
	strm.avail_in = dictLength;
	strm.next_in = 0;
	strm.input = dictionary;
	fill_window(s);
	while (s.lookahead >= MIN_MATCH) {
		let str = s.strstart;
		let n = s.lookahead - (MIN_MATCH - 1);
		do {
			INSERT_STRING(s, str);
			str++;
		} while (--n);
		s.strstart = str;
		s.lookahead = MIN_MATCH - 1;
		fill_window(s);
	}
	s.strstart += s.lookahead;
	s.block_start = s.strstart;
	s.insert = s.lookahead;
	s.lookahead = 0;
	s.match_length = s.prev_length = MIN_MATCH - 1;
	s.match_available = 0;
	strm.next_in = next;
	strm.input = input;
	strm.avail_in = avail;
	s.wrap = wrap;
	return 0;
};
//#endregion
//#region src/zlib/inffast.mjs
var BAD$1 = 16209;
var TYPE$1 = 16191;
function inflate_fast(strm, start) {
	let _in;
	let last;
	let _out;
	let beg;
	let end;
	let dmax;
	let wsize;
	let whave;
	let wnext;
	let s_window;
	let hold;
	let bits;
	let lcode;
	let dcode;
	let lmask;
	let dmask;
	let here;
	let op;
	let len;
	let dist;
	let from;
	let from_source;
	let input, output;
	const state = strm.state;
	_in = strm.next_in;
	input = strm.input;
	last = _in + (strm.avail_in - 5);
	_out = strm.next_out;
	output = strm.output;
	beg = _out - (start - strm.avail_out);
	end = _out + (strm.avail_out - 257);
	dmax = state.dmax;
	wsize = state.wsize;
	whave = state.whave;
	wnext = state.wnext;
	s_window = state.window;
	hold = state.hold;
	bits = state.bits;
	lcode = state.lencode;
	dcode = state.distcode;
	lmask = (1 << state.lenbits) - 1;
	dmask = (1 << state.distbits) - 1;
	top: do {
		if (bits < 15) {
			hold += input[_in++] << bits;
			bits += 8;
			hold += input[_in++] << bits;
			bits += 8;
		}
		here = lcode[hold & lmask];
		dolen: for (;;) {
			op = here >>> 24;
			hold >>>= op;
			bits -= op;
			op = here >>> 16 & 255;
			if (op === 0) output[_out++] = here & 65535;
			else if (op & 16) {
				len = here & 65535;
				op &= 15;
				if (op) {
					if (bits < op) {
						hold += input[_in++] << bits;
						bits += 8;
					}
					len += hold & (1 << op) - 1;
					hold >>>= op;
					bits -= op;
				}
				if (bits < 15) {
					hold += input[_in++] << bits;
					bits += 8;
					hold += input[_in++] << bits;
					bits += 8;
				}
				here = dcode[hold & dmask];
				dodist: for (;;) {
					op = here >>> 24;
					hold >>>= op;
					bits -= op;
					op = here >>> 16 & 255;
					if (op & 16) {
						dist = here & 65535;
						op &= 15;
						if (bits < op) {
							hold += input[_in++] << bits;
							bits += 8;
							if (bits < op) {
								hold += input[_in++] << bits;
								bits += 8;
							}
						}
						dist += hold & (1 << op) - 1;
						if (dist > dmax) {
							strm.msg = "invalid distance too far back";
							state.mode = BAD$1;
							break top;
						}
						hold >>>= op;
						bits -= op;
						op = _out - beg;
						if (dist > op) {
							op = dist - op;
							if (op > whave) {
								if (state.sane) {
									strm.msg = "invalid distance too far back";
									state.mode = BAD$1;
									break top;
								}
							}
							from = 0;
							from_source = s_window;
							if (wnext === 0) {
								from += wsize - op;
								if (op < len) {
									len -= op;
									do
										output[_out++] = s_window[from++];
									while (--op);
									from = _out - dist;
									from_source = output;
								}
							} else if (wnext < op) {
								from += wsize + wnext - op;
								op -= wnext;
								if (op < len) {
									len -= op;
									do
										output[_out++] = s_window[from++];
									while (--op);
									from = 0;
									if (wnext < len) {
										op = wnext;
										len -= op;
										do
											output[_out++] = s_window[from++];
										while (--op);
										from = _out - dist;
										from_source = output;
									}
								}
							} else {
								from += wnext - op;
								if (op < len) {
									len -= op;
									do
										output[_out++] = s_window[from++];
									while (--op);
									from = _out - dist;
									from_source = output;
								}
							}
							while (len > 2) {
								output[_out++] = from_source[from++];
								output[_out++] = from_source[from++];
								output[_out++] = from_source[from++];
								len -= 3;
							}
							if (len) {
								output[_out++] = from_source[from++];
								if (len > 1) output[_out++] = from_source[from++];
							}
						} else {
							from = _out - dist;
							do {
								output[_out++] = output[from++];
								output[_out++] = output[from++];
								output[_out++] = output[from++];
								len -= 3;
							} while (len > 2);
							if (len) {
								output[_out++] = output[from++];
								if (len > 1) output[_out++] = output[from++];
							}
						}
					} else if ((op & 64) === 0) {
						here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
						continue dodist;
					} else {
						strm.msg = "invalid distance code";
						state.mode = BAD$1;
						break top;
					}
					break;
				}
			} else if ((op & 64) === 0) {
				here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
				continue dolen;
			} else if (op & 32) {
				state.mode = TYPE$1;
				break top;
			} else {
				strm.msg = "invalid literal/length code";
				state.mode = BAD$1;
				break top;
			}
			break;
		}
	} while (_in < last && _out < end);
	len = bits >> 3;
	_in -= len;
	bits -= len << 3;
	hold &= (1 << bits) - 1;
	strm.next_in = _in;
	strm.next_out = _out;
	strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
	strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
	state.hold = hold;
	state.bits = bits;
}
//#endregion
//#region src/zlib/inftrees.mjs
var MAXBITS = 15;
var ENOUGH_LENS$1 = 852;
var ENOUGH_DISTS$1 = 592;
var CODES$1 = 0;
var LENS$1 = 1;
var DISTS$1 = 2;
var lbase = new Uint16Array([
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	13,
	15,
	17,
	19,
	23,
	27,
	31,
	35,
	43,
	51,
	59,
	67,
	83,
	99,
	115,
	131,
	163,
	195,
	227,
	258,
	0,
	0
]);
var lext = new Uint8Array([
	16,
	16,
	16,
	16,
	16,
	16,
	16,
	16,
	17,
	17,
	17,
	17,
	18,
	18,
	18,
	18,
	19,
	19,
	19,
	19,
	20,
	20,
	20,
	20,
	21,
	21,
	21,
	21,
	16,
	199,
	75
]);
var dbase = new Uint16Array([
	1,
	2,
	3,
	4,
	5,
	7,
	9,
	13,
	17,
	25,
	33,
	49,
	65,
	97,
	129,
	193,
	257,
	385,
	513,
	769,
	1025,
	1537,
	2049,
	3073,
	4097,
	6145,
	8193,
	12289,
	16385,
	24577,
	0,
	0
]);
var dext = new Uint8Array([
	16,
	16,
	16,
	16,
	17,
	17,
	18,
	18,
	19,
	19,
	20,
	20,
	21,
	21,
	22,
	22,
	23,
	23,
	24,
	24,
	25,
	25,
	26,
	26,
	27,
	27,
	28,
	28,
	29,
	29,
	64,
	64
]);
var inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
	const bits = opts.bits;
	let len = 0;
	let sym = 0;
	let min = 0, max = 0;
	let root = 0;
	let curr = 0;
	let drop = 0;
	let left = 0;
	let used = 0;
	let huff = 0;
	let incr;
	let fill;
	let low;
	let mask;
	let next;
	let base = null;
	let match;
	const count = /* @__PURE__ */ new Uint16Array(16);
	const offs = /* @__PURE__ */ new Uint16Array(16);
	let extra = null;
	let here_bits, here_op, here_val;
	for (len = 0; len <= MAXBITS; len++) count[len] = 0;
	for (sym = 0; sym < codes; sym++) count[lens[lens_index + sym]]++;
	root = bits;
	for (max = MAXBITS; max >= 1; max--) if (count[max] !== 0) break;
	if (root > max) root = max;
	if (max === 0) {
		table[table_index++] = 20971520;
		table[table_index++] = 20971520;
		opts.bits = 1;
		return 0;
	}
	for (min = 1; min < max; min++) if (count[min] !== 0) break;
	if (root < min) root = min;
	left = 1;
	for (len = 1; len <= MAXBITS; len++) {
		left <<= 1;
		left -= count[len];
		if (left < 0) return -1;
	}
	if (left > 0 && (type === CODES$1 || max !== 1)) return -1;
	offs[1] = 0;
	for (len = 1; len < MAXBITS; len++) offs[len + 1] = offs[len] + count[len];
	for (sym = 0; sym < codes; sym++) if (lens[lens_index + sym] !== 0) work[offs[lens[lens_index + sym]]++] = sym;
	if (type === CODES$1) {
		base = extra = work;
		match = 20;
	} else if (type === LENS$1) {
		base = lbase;
		extra = lext;
		match = 257;
	} else {
		base = dbase;
		extra = dext;
		match = 0;
	}
	huff = 0;
	sym = 0;
	len = min;
	next = table_index;
	curr = root;
	drop = 0;
	low = -1;
	used = 1 << root;
	mask = used - 1;
	if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) return 1;
	for (;;) {
		here_bits = len - drop;
		if (work[sym] + 1 < match) {
			here_op = 0;
			here_val = work[sym];
		} else if (work[sym] >= match) {
			here_op = extra[work[sym] - match];
			here_val = base[work[sym] - match];
		} else {
			here_op = 96;
			here_val = 0;
		}
		incr = 1 << len - drop;
		fill = 1 << curr;
		min = fill;
		do {
			fill -= incr;
			table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
		} while (fill !== 0);
		incr = 1 << len - 1;
		while (huff & incr) incr >>= 1;
		if (incr !== 0) {
			huff &= incr - 1;
			huff += incr;
		} else huff = 0;
		sym++;
		if (--count[len] === 0) {
			if (len === max) break;
			len = lens[lens_index + work[sym]];
		}
		if (len > root && (huff & mask) !== low) {
			if (drop === 0) drop = root;
			next += min;
			curr = len - drop;
			left = 1 << curr;
			while (curr + drop < max) {
				left -= count[curr + drop];
				if (left <= 0) break;
				curr++;
				left <<= 1;
			}
			used += 1 << curr;
			if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) return 1;
			low = huff & mask;
			table[low] = root << 24 | curr << 16 | next - table_index | 0;
		}
	}
	if (huff !== 0) table[next + huff] = len - drop << 24 | 4194304;
	opts.bits = root;
	return 0;
};
//#endregion
//#region src/zlib/inflate.mjs
var CODES = 0;
var LENS = 1;
var DISTS = 2;
var HEAD = 16180;
var FLAGS = 16181;
var TIME = 16182;
var OS = 16183;
var EXLEN = 16184;
var EXTRA = 16185;
var NAME = 16186;
var COMMENT = 16187;
var HCRC = 16188;
var DICTID = 16189;
var DICT = 16190;
var TYPE = 16191;
var TYPEDO = 16192;
var STORED = 16193;
var COPY_ = 16194;
var COPY = 16195;
var TABLE = 16196;
var LENLENS = 16197;
var CODELENS = 16198;
var LEN_ = 16199;
var LEN = 16200;
var LENEXT = 16201;
var DIST = 16202;
var DISTEXT = 16203;
var MATCH = 16204;
var LIT = 16205;
var CHECK = 16206;
var LENGTH = 16207;
var DONE = 16208;
var BAD = 16209;
var MEM = 16210;
var SYNC = 16211;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
var DEF_WBITS = 15;
var zswap32 = (q) => {
	return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
};
var InflateState = class {
	constructor() {
		this.strm = null;
		this.mode = 0;
		this.last = false;
		this.wrap = 0;
		this.havedict = false;
		this.flags = 0;
		this.dmax = 0;
		this.check = 0;
		this.total = 0;
		this.head = null;
		this.wbits = 0;
		this.wsize = 0;
		this.whave = 0;
		this.wnext = 0;
		this.window = null;
		this.hold = 0;
		this.bits = 0;
		this.length = 0;
		this.offset = 0;
		this.extra = 0;
		this.lencode = null;
		this.distcode = null;
		this.lenbits = 0;
		this.distbits = 0;
		this.ncode = 0;
		this.nlen = 0;
		this.ndist = 0;
		this.have = 0;
		this.next = null;
		this.lens = /* @__PURE__ */ new Uint16Array(320);
		this.work = /* @__PURE__ */ new Uint16Array(288);
		this.lendyn = null;
		this.distdyn = null;
		this.sane = 0;
		this.back = 0;
		this.was = 0;
	}
};
var inflateStateCheck = (strm) => {
	if (!strm) return 1;
	const state = strm.state;
	if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) return 1;
	return 0;
};
var inflateResetKeep = (strm) => {
	if (inflateStateCheck(strm)) return -2;
	const state = strm.state;
	strm.total_in = strm.total_out = state.total = 0;
	strm.msg = "";
	if (state.wrap) strm.adler = state.wrap & 1;
	state.mode = HEAD;
	state.last = 0;
	state.havedict = 0;
	state.flags = -1;
	state.dmax = 32768;
	state.head = null;
	state.hold = 0;
	state.bits = 0;
	state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
	state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
	state.sane = 1;
	state.back = -1;
	return 0;
};
var inflateReset = (strm) => {
	if (inflateStateCheck(strm)) return -2;
	const state = strm.state;
	state.wsize = 0;
	state.whave = 0;
	state.wnext = 0;
	return inflateResetKeep(strm);
};
var inflateReset2 = (strm, windowBits) => {
	let wrap;
	if (inflateStateCheck(strm)) return -2;
	const state = strm.state;
	if (windowBits < 0) {
		wrap = 0;
		windowBits = -windowBits;
	} else {
		wrap = (windowBits >> 4) + 5;
		if (windowBits < 48) windowBits &= 15;
	}
	if (windowBits && (windowBits < 8 || windowBits > 15)) return -2;
	if (state.window !== null && state.wbits !== windowBits) state.window = null;
	state.wrap = wrap;
	state.wbits = windowBits;
	return inflateReset(strm);
};
var inflateInit2 = (strm, windowBits) => {
	if (!strm) return -2;
	const state = new InflateState();
	strm.state = state;
	state.strm = strm;
	state.window = null;
	state.mode = HEAD;
	const ret = inflateReset2(strm, windowBits);
	if (ret !== 0) strm.state = null;
	return ret;
};
var inflateInit = (strm) => {
	return inflateInit2(strm, DEF_WBITS);
};
var virgin = true;
var lenfix, distfix;
var fixedtables = (state) => {
	if (virgin) {
		lenfix = /* @__PURE__ */ new Int32Array(512);
		distfix = /* @__PURE__ */ new Int32Array(32);
		let sym = 0;
		while (sym < 144) state.lens[sym++] = 8;
		while (sym < 256) state.lens[sym++] = 9;
		while (sym < 280) state.lens[sym++] = 7;
		while (sym < 288) state.lens[sym++] = 8;
		inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
		sym = 0;
		while (sym < 32) state.lens[sym++] = 5;
		inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
		virgin = false;
	}
	state.lencode = lenfix;
	state.lenbits = 9;
	state.distcode = distfix;
	state.distbits = 5;
};
var updatewindow = (strm, src, end, copy) => {
	let dist;
	const state = strm.state;
	if (state.window === null) state.window = new Uint8Array(1 << state.wbits);
	if (state.wsize === 0) {
		state.wsize = 1 << state.wbits;
		state.wnext = 0;
		state.whave = 0;
	}
	if (copy >= state.wsize) {
		state.window.set(src.subarray(end - state.wsize, end), 0);
		state.wnext = 0;
		state.whave = state.wsize;
	} else {
		dist = state.wsize - state.wnext;
		if (dist > copy) dist = copy;
		state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
		copy -= dist;
		if (copy) {
			state.window.set(src.subarray(end - copy, end), 0);
			state.wnext = copy;
			state.whave = state.wsize;
		} else {
			state.wnext += dist;
			if (state.wnext === state.wsize) state.wnext = 0;
			if (state.whave < state.wsize) state.whave += dist;
		}
	}
	return 0;
};
var inflate$1 = (strm, flush) => {
	let state;
	let input, output;
	let next;
	let put;
	let have, left;
	let hold;
	let bits;
	let _in, _out;
	let copy;
	let from;
	let from_source;
	let here = 0;
	let here_bits, here_op, here_val;
	let last_bits, last_op, last_val;
	let len;
	let ret;
	const hbuf = /* @__PURE__ */ new Uint8Array(4);
	let opts;
	let n;
	const order = new Uint8Array([
		16,
		17,
		18,
		0,
		8,
		7,
		9,
		6,
		10,
		5,
		11,
		4,
		12,
		3,
		13,
		2,
		14,
		1,
		15
	]);
	if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) return -2;
	state = strm.state;
	if (state.mode === TYPE) state.mode = TYPEDO;
	put = strm.next_out;
	output = strm.output;
	left = strm.avail_out;
	next = strm.next_in;
	input = strm.input;
	have = strm.avail_in;
	hold = state.hold;
	bits = state.bits;
	_in = have;
	_out = left;
	ret = 0;
	inf_leave: for (;;) switch (state.mode) {
		case HEAD:
			if (state.wrap === 0) {
				state.mode = TYPEDO;
				break;
			}
			while (bits < 16) {
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			if (state.wrap & 2 && hold === 35615) {
				if (state.wbits === 0) state.wbits = 15;
				state.check = 0;
				hbuf[0] = hold & 255;
				hbuf[1] = hold >>> 8 & 255;
				state.check = crc32(state.check, hbuf, 2, 0);
				hold = 0;
				bits = 0;
				state.mode = FLAGS;
				break;
			}
			if (state.head) state.head.done = false;
			if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) {
				strm.msg = "incorrect header check";
				state.mode = BAD;
				break;
			}
			if ((hold & 15) !== 8) {
				strm.msg = "unknown compression method";
				state.mode = BAD;
				break;
			}
			hold >>>= 4;
			bits -= 4;
			len = (hold & 15) + 8;
			if (state.wbits === 0) state.wbits = len;
			if (len > 15 || len > state.wbits) {
				strm.msg = "invalid window size";
				state.mode = BAD;
				break;
			}
			state.dmax = 1 << state.wbits;
			state.flags = 0;
			strm.adler = state.check = 1;
			state.mode = hold & 512 ? DICTID : TYPE;
			hold = 0;
			bits = 0;
			break;
		case FLAGS:
			while (bits < 16) {
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			state.flags = hold;
			if ((state.flags & 255) !== 8) {
				strm.msg = "unknown compression method";
				state.mode = BAD;
				break;
			}
			if (state.flags & 57344) {
				strm.msg = "unknown header flags set";
				state.mode = BAD;
				break;
			}
			if (state.head) state.head.text = hold >> 8 & 1;
			if (state.flags & 512 && state.wrap & 4) {
				hbuf[0] = hold & 255;
				hbuf[1] = hold >>> 8 & 255;
				state.check = crc32(state.check, hbuf, 2, 0);
			}
			hold = 0;
			bits = 0;
			state.mode = TIME;
		case TIME:
			while (bits < 32) {
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			if (state.head) state.head.time = hold;
			if (state.flags & 512 && state.wrap & 4) {
				hbuf[0] = hold & 255;
				hbuf[1] = hold >>> 8 & 255;
				hbuf[2] = hold >>> 16 & 255;
				hbuf[3] = hold >>> 24 & 255;
				state.check = crc32(state.check, hbuf, 4, 0);
			}
			hold = 0;
			bits = 0;
			state.mode = OS;
		case OS:
			while (bits < 16) {
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			if (state.head) {
				state.head.xflags = hold & 255;
				state.head.os = hold >> 8;
			}
			if (state.flags & 512 && state.wrap & 4) {
				hbuf[0] = hold & 255;
				hbuf[1] = hold >>> 8 & 255;
				state.check = crc32(state.check, hbuf, 2, 0);
			}
			hold = 0;
			bits = 0;
			state.mode = EXLEN;
		case EXLEN:
			if (state.flags & 1024) {
				while (bits < 16) {
					if (have === 0) break inf_leave;
					have--;
					hold += input[next++] << bits;
					bits += 8;
				}
				state.length = hold;
				if (state.head) state.head.extra_len = hold;
				if (state.flags & 512 && state.wrap & 4) {
					hbuf[0] = hold & 255;
					hbuf[1] = hold >>> 8 & 255;
					state.check = crc32(state.check, hbuf, 2, 0);
				}
				hold = 0;
				bits = 0;
			} else if (state.head) state.head.extra = null;
			state.mode = EXTRA;
		case EXTRA:
			if (state.flags & 1024) {
				copy = state.length;
				if (copy > have) copy = have;
				if (copy) {
					if (state.head) {
						len = state.head.extra_len - state.length;
						if (!state.head.extra) state.head.extra = new Uint8Array(state.head.extra_len);
						state.head.extra.set(input.subarray(next, next + copy), len);
					}
					if (state.flags & 512 && state.wrap & 4) state.check = crc32(state.check, input, copy, next);
					have -= copy;
					next += copy;
					state.length -= copy;
				}
				if (state.length) break inf_leave;
			}
			state.length = 0;
			state.mode = NAME;
		case NAME:
			if (state.flags & 2048) {
				if (have === 0) break inf_leave;
				copy = 0;
				do {
					len = input[next + copy++];
					if (state.head && len && state.length < 65536) state.head.name += String.fromCharCode(len);
				} while (len && copy < have);
				if (state.flags & 512 && state.wrap & 4) state.check = crc32(state.check, input, copy, next);
				have -= copy;
				next += copy;
				if (len) break inf_leave;
			} else if (state.head) state.head.name = null;
			state.length = 0;
			state.mode = COMMENT;
		case COMMENT:
			if (state.flags & 4096) {
				if (have === 0) break inf_leave;
				copy = 0;
				do {
					len = input[next + copy++];
					if (state.head && len && state.length < 65536) state.head.comment += String.fromCharCode(len);
				} while (len && copy < have);
				if (state.flags & 512 && state.wrap & 4) state.check = crc32(state.check, input, copy, next);
				have -= copy;
				next += copy;
				if (len) break inf_leave;
			} else if (state.head) state.head.comment = null;
			state.mode = HCRC;
		case HCRC:
			if (state.flags & 512) {
				while (bits < 16) {
					if (have === 0) break inf_leave;
					have--;
					hold += input[next++] << bits;
					bits += 8;
				}
				if (state.wrap & 4 && hold !== (state.check & 65535)) {
					strm.msg = "header crc mismatch";
					state.mode = BAD;
					break;
				}
				hold = 0;
				bits = 0;
			}
			if (state.head) {
				state.head.hcrc = state.flags >> 9 & 1;
				state.head.done = true;
			}
			strm.adler = state.check = 0;
			state.mode = TYPE;
			break;
		case DICTID:
			while (bits < 32) {
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			strm.adler = state.check = zswap32(hold);
			hold = 0;
			bits = 0;
			state.mode = DICT;
		case DICT:
			if (state.havedict === 0) {
				strm.next_out = put;
				strm.avail_out = left;
				strm.next_in = next;
				strm.avail_in = have;
				state.hold = hold;
				state.bits = bits;
				return 2;
			}
			strm.adler = state.check = 1;
			state.mode = TYPE;
		case TYPE: if (flush === 5 || flush === 6) break inf_leave;
		case TYPEDO:
			if (state.last) {
				hold >>>= bits & 7;
				bits -= bits & 7;
				state.mode = CHECK;
				break;
			}
			while (bits < 3) {
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			state.last = hold & 1;
			hold >>>= 1;
			bits -= 1;
			switch (hold & 3) {
				case 0:
					state.mode = STORED;
					break;
				case 1:
					fixedtables(state);
					state.mode = LEN_;
					if (flush === 6) {
						hold >>>= 2;
						bits -= 2;
						break inf_leave;
					}
					break;
				case 2:
					state.mode = TABLE;
					break;
				case 3:
					strm.msg = "invalid block type";
					state.mode = BAD;
			}
			hold >>>= 2;
			bits -= 2;
			break;
		case STORED:
			hold >>>= bits & 7;
			bits -= bits & 7;
			while (bits < 32) {
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
				strm.msg = "invalid stored block lengths";
				state.mode = BAD;
				break;
			}
			state.length = hold & 65535;
			hold = 0;
			bits = 0;
			state.mode = COPY_;
			if (flush === 6) break inf_leave;
		case COPY_: state.mode = COPY;
		case COPY:
			copy = state.length;
			if (copy) {
				if (copy > have) copy = have;
				if (copy > left) copy = left;
				if (copy === 0) break inf_leave;
				output.set(input.subarray(next, next + copy), put);
				have -= copy;
				next += copy;
				left -= copy;
				put += copy;
				state.length -= copy;
				break;
			}
			state.mode = TYPE;
			break;
		case TABLE:
			while (bits < 14) {
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			state.nlen = (hold & 31) + 257;
			hold >>>= 5;
			bits -= 5;
			state.ndist = (hold & 31) + 1;
			hold >>>= 5;
			bits -= 5;
			state.ncode = (hold & 15) + 4;
			hold >>>= 4;
			bits -= 4;
			if (state.nlen > 286 || state.ndist > 30) {
				strm.msg = "too many length or distance symbols";
				state.mode = BAD;
				break;
			}
			state.have = 0;
			state.mode = LENLENS;
		case LENLENS:
			while (state.have < state.ncode) {
				while (bits < 3) {
					if (have === 0) break inf_leave;
					have--;
					hold += input[next++] << bits;
					bits += 8;
				}
				state.lens[order[state.have++]] = hold & 7;
				hold >>>= 3;
				bits -= 3;
			}
			while (state.have < 19) state.lens[order[state.have++]] = 0;
			state.lencode = state.lendyn;
			state.lenbits = 7;
			opts = { bits: state.lenbits };
			ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
			state.lenbits = opts.bits;
			if (ret) {
				strm.msg = "invalid code lengths set";
				state.mode = BAD;
				break;
			}
			state.have = 0;
			state.mode = CODELENS;
		case CODELENS:
			while (state.have < state.nlen + state.ndist) {
				for (;;) {
					here = state.lencode[hold & (1 << state.lenbits) - 1];
					here_bits = here >>> 24;
					here_op = here >>> 16 & 255;
					here_val = here & 65535;
					if (here_bits <= bits) break;
					if (have === 0) break inf_leave;
					have--;
					hold += input[next++] << bits;
					bits += 8;
				}
				if (here_val < 16) {
					hold >>>= here_bits;
					bits -= here_bits;
					state.lens[state.have++] = here_val;
				} else {
					if (here_val === 16) {
						n = here_bits + 2;
						while (bits < n) {
							if (have === 0) break inf_leave;
							have--;
							hold += input[next++] << bits;
							bits += 8;
						}
						hold >>>= here_bits;
						bits -= here_bits;
						if (state.have === 0) {
							strm.msg = "invalid bit length repeat";
							state.mode = BAD;
							break;
						}
						len = state.lens[state.have - 1];
						copy = 3 + (hold & 3);
						hold >>>= 2;
						bits -= 2;
					} else if (here_val === 17) {
						n = here_bits + 3;
						while (bits < n) {
							if (have === 0) break inf_leave;
							have--;
							hold += input[next++] << bits;
							bits += 8;
						}
						hold >>>= here_bits;
						bits -= here_bits;
						len = 0;
						copy = 3 + (hold & 7);
						hold >>>= 3;
						bits -= 3;
					} else {
						n = here_bits + 7;
						while (bits < n) {
							if (have === 0) break inf_leave;
							have--;
							hold += input[next++] << bits;
							bits += 8;
						}
						hold >>>= here_bits;
						bits -= here_bits;
						len = 0;
						copy = 11 + (hold & 127);
						hold >>>= 7;
						bits -= 7;
					}
					if (state.have + copy > state.nlen + state.ndist) {
						strm.msg = "invalid bit length repeat";
						state.mode = BAD;
						break;
					}
					while (copy--) state.lens[state.have++] = len;
				}
			}
			if (state.mode === BAD) break;
			if (state.lens[256] === 0) {
				strm.msg = "invalid code -- missing end-of-block";
				state.mode = BAD;
				break;
			}
			state.lenbits = 9;
			opts = { bits: state.lenbits };
			ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
			state.lenbits = opts.bits;
			if (ret) {
				strm.msg = "invalid literal/lengths set";
				state.mode = BAD;
				break;
			}
			state.distbits = 6;
			state.distcode = state.distdyn;
			opts = { bits: state.distbits };
			ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
			state.distbits = opts.bits;
			if (ret) {
				strm.msg = "invalid distances set";
				state.mode = BAD;
				break;
			}
			state.mode = LEN_;
			if (flush === 6) break inf_leave;
		case LEN_: state.mode = LEN;
		case LEN:
			if (have >= 6 && left >= 258) {
				strm.next_out = put;
				strm.avail_out = left;
				strm.next_in = next;
				strm.avail_in = have;
				state.hold = hold;
				state.bits = bits;
				inflate_fast(strm, _out);
				put = strm.next_out;
				output = strm.output;
				left = strm.avail_out;
				next = strm.next_in;
				input = strm.input;
				have = strm.avail_in;
				hold = state.hold;
				bits = state.bits;
				if (state.mode === TYPE) state.back = -1;
				break;
			}
			state.back = 0;
			for (;;) {
				here = state.lencode[hold & (1 << state.lenbits) - 1];
				here_bits = here >>> 24;
				here_op = here >>> 16 & 255;
				here_val = here & 65535;
				if (here_bits <= bits) break;
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			if (here_op && (here_op & 240) === 0) {
				last_bits = here_bits;
				last_op = here_op;
				last_val = here_val;
				for (;;) {
					here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
					here_bits = here >>> 24;
					here_op = here >>> 16 & 255;
					here_val = here & 65535;
					if (last_bits + here_bits <= bits) break;
					if (have === 0) break inf_leave;
					have--;
					hold += input[next++] << bits;
					bits += 8;
				}
				hold >>>= last_bits;
				bits -= last_bits;
				state.back += last_bits;
			}
			hold >>>= here_bits;
			bits -= here_bits;
			state.back += here_bits;
			state.length = here_val;
			if (here_op === 0) {
				state.mode = LIT;
				break;
			}
			if (here_op & 32) {
				state.back = -1;
				state.mode = TYPE;
				break;
			}
			if (here_op & 64) {
				strm.msg = "invalid literal/length code";
				state.mode = BAD;
				break;
			}
			state.extra = here_op & 15;
			state.mode = LENEXT;
		case LENEXT:
			if (state.extra) {
				n = state.extra;
				while (bits < n) {
					if (have === 0) break inf_leave;
					have--;
					hold += input[next++] << bits;
					bits += 8;
				}
				state.length += hold & (1 << state.extra) - 1;
				hold >>>= state.extra;
				bits -= state.extra;
				state.back += state.extra;
			}
			state.was = state.length;
			state.mode = DIST;
		case DIST:
			for (;;) {
				here = state.distcode[hold & (1 << state.distbits) - 1];
				here_bits = here >>> 24;
				here_op = here >>> 16 & 255;
				here_val = here & 65535;
				if (here_bits <= bits) break;
				if (have === 0) break inf_leave;
				have--;
				hold += input[next++] << bits;
				bits += 8;
			}
			if ((here_op & 240) === 0) {
				last_bits = here_bits;
				last_op = here_op;
				last_val = here_val;
				for (;;) {
					here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
					here_bits = here >>> 24;
					here_op = here >>> 16 & 255;
					here_val = here & 65535;
					if (last_bits + here_bits <= bits) break;
					if (have === 0) break inf_leave;
					have--;
					hold += input[next++] << bits;
					bits += 8;
				}
				hold >>>= last_bits;
				bits -= last_bits;
				state.back += last_bits;
			}
			hold >>>= here_bits;
			bits -= here_bits;
			state.back += here_bits;
			if (here_op & 64) {
				strm.msg = "invalid distance code";
				state.mode = BAD;
				break;
			}
			state.offset = here_val;
			state.extra = here_op & 15;
			state.mode = DISTEXT;
		case DISTEXT:
			if (state.extra) {
				n = state.extra;
				while (bits < n) {
					if (have === 0) break inf_leave;
					have--;
					hold += input[next++] << bits;
					bits += 8;
				}
				state.offset += hold & (1 << state.extra) - 1;
				hold >>>= state.extra;
				bits -= state.extra;
				state.back += state.extra;
			}
			if (state.offset > state.dmax) {
				strm.msg = "invalid distance too far back";
				state.mode = BAD;
				break;
			}
			state.mode = MATCH;
		case MATCH:
			if (left === 0) break inf_leave;
			copy = _out - left;
			if (state.offset > copy) {
				copy = state.offset - copy;
				if (copy > state.whave) {
					if (state.sane) {
						strm.msg = "invalid distance too far back";
						state.mode = BAD;
						break;
					}
				}
				if (copy > state.wnext) {
					copy -= state.wnext;
					from = state.wsize - copy;
				} else from = state.wnext - copy;
				if (copy > state.length) copy = state.length;
				from_source = state.window;
			} else {
				from_source = output;
				from = put - state.offset;
				copy = state.length;
			}
			if (copy > left) copy = left;
			left -= copy;
			state.length -= copy;
			do
				output[put++] = from_source[from++];
			while (--copy);
			if (state.length === 0) state.mode = LEN;
			break;
		case LIT:
			if (left === 0) break inf_leave;
			output[put++] = state.length;
			left--;
			state.mode = LEN;
			break;
		case CHECK:
			if (state.wrap) {
				while (bits < 32) {
					if (have === 0) break inf_leave;
					have--;
					hold |= input[next++] << bits;
					bits += 8;
				}
				_out -= left;
				strm.total_out += _out;
				state.total += _out;
				if (state.wrap & 4 && _out) strm.adler = state.check = state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
				_out = left;
				if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
					strm.msg = "incorrect data check";
					state.mode = BAD;
					break;
				}
				hold = 0;
				bits = 0;
			}
			state.mode = LENGTH;
		case LENGTH:
			if (state.wrap && state.flags) {
				while (bits < 32) {
					if (have === 0) break inf_leave;
					have--;
					hold += input[next++] << bits;
					bits += 8;
				}
				if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
					strm.msg = "incorrect length check";
					state.mode = BAD;
					break;
				}
				hold = 0;
				bits = 0;
			}
			state.mode = DONE;
		case DONE:
			ret = 1;
			break inf_leave;
		case BAD:
			ret = -3;
			break inf_leave;
		case MEM: return -4;
		case SYNC:
		default: return -2;
	}
	strm.next_out = put;
	strm.avail_out = left;
	strm.next_in = next;
	strm.avail_in = have;
	state.hold = hold;
	state.bits = bits;
	if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== 4)) {
		if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
			state.mode = MEM;
			return -4;
		}
	}
	_in -= strm.avail_in;
	_out -= strm.avail_out;
	strm.total_in += _in;
	strm.total_out += _out;
	state.total += _out;
	if (state.wrap & 4 && _out) strm.adler = state.check = state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
	strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
	if ((_in === 0 && _out === 0 || flush === 4) && ret === 0) ret = -5;
	return ret;
};
var inflateEnd = (strm) => {
	if (inflateStateCheck(strm)) return -2;
	let state = strm.state;
	if (state.window) state.window = null;
	strm.state = null;
	return 0;
};
var inflateGetHeader = (strm, head) => {
	if (inflateStateCheck(strm)) return -2;
	const state = strm.state;
	if ((state.wrap & 2) === 0) return -2;
	state.head = head;
	head.done = false;
	return 0;
};
var inflateSetDictionary = (strm, dictionary) => {
	const dictLength = dictionary.length;
	let state;
	let dictid;
	let ret;
	if (inflateStateCheck(strm)) return -2;
	state = strm.state;
	if (state.wrap !== 0 && state.mode !== DICT) return -2;
	if (state.mode === DICT) {
		dictid = 1;
		dictid = adler32(dictid, dictionary, dictLength, 0);
		if (dictid !== state.check) return -3;
	}
	ret = updatewindow(strm, dictionary, dictLength, dictLength);
	if (ret) {
		state.mode = MEM;
		return -4;
	}
	state.havedict = 1;
	return 0;
};
//#endregion
//#region src/zlib/zstream.mjs
var ZStream = class {
	constructor() {
		this.input = null;
		this.next_in = 0;
		this.avail_in = 0;
		this.total_in = 0;
		this.output = null;
		this.next_out = 0;
		this.avail_out = 0;
		this.total_out = 0;
		this.msg = "";
		this.state = null;
		this.data_type = 2;
		this.adler = 0;
	}
};
//#endregion
//#region src/zlib/gzheader.mjs
var GZheader = class {
	constructor() {
		this.text = 0;
		this.time = 0;
		this.xflags = 0;
		this.os = 0;
		this.extra = null;
		this.extra_len = 0;
		this.name = "";
		this.comment = "";
		this.hcrc = 0;
		this.done = false;
	}
};
//#endregion
//#region src/utils.ts
var flattenChunks = (chunks) => {
	const result = new Uint8Array(chunks.reduce((len, chunk) => len + chunk.length, 0));
	let pos = 0;
	for (const chunk of chunks) {
		result.set(chunk, pos);
		pos += chunk.length;
	}
	return result;
};
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/typeof.js
function _typeof(o) {
	"@babel/helpers - typeof";
	return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof(o);
}
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/toPrimitive.js
function toPrimitive(t, r) {
	if ("object" != _typeof(t) || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r || "default");
		if ("object" != _typeof(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/toPropertyKey.js
function toPropertyKey(t) {
	var i = toPrimitive(t, "string");
	return "symbol" == _typeof(i) ? i : i + "";
}
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/defineProperty.js
function _defineProperty(e, r, t) {
	return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[r] = t, e;
}
//#endregion
//#region src/deflate.ts
var toString$1 = Object.prototype.toString;
var defaultOptions$1 = {
	level: -1,
	chunkSize: 16384,
	windowBits: 15,
	memLevel: 8,
	strategy: 0,
	raw: false,
	gzip: false,
	legacyHash: false,
	dictionary: /* @__PURE__ */ new Uint8Array(0)
};
/**
* Generic JS-style wrapper for zlib calls. If you don't need
* streaming behaviour, use the simpler functions {@link deflate},
* {@link deflateRaw} and {@link gzip}.
*/
var Deflate = class {
	/**
	* Creates a new deflator instance with the specified params. Throws an
	* exception on bad params. See {@link DeflateOptions} for the list of
	* supported options.
	*
	* @example
	* ```javascript
	* import { Deflate } from 'pako'
	*
	* const chunk1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
	* const chunk2 = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
	*
	* const deflate = new Deflate({ level: 3 })
	*
	* deflate.push(chunk1, false)
	* deflate.push(chunk2, true)  // true -> last chunk
	*
	* if (deflate.err) throw new Error(deflate.err)
	*
	* console.log(deflate.result)
	* ```
	*/
	constructor(options = {}) {
		_defineProperty(this, "options", void 0);
		_defineProperty(
			this,
			/**
			* Error code after deflate finishes. {@link Z_OK} on success.
			* You will not need it in real life, because deflate errors
			* are possible only on wrong options or bad custom `onData` / `onEnd`
			* handlers.
			*/
			"err",
			void 0
		);
		_defineProperty(
			this,
			/** Error message, if {@link Deflate.err} is not {@link Z_OK}. */
			"msg",
			void 0
		);
		_defineProperty(this, "ended", void 0);
		_defineProperty(this, "started", void 0);
		_defineProperty(
			this,
			/**
			* Chunks of output data, if {@link Deflate.onData} not overridden.
			* @internal
			*/
			"chunks",
			void 0
		);
		_defineProperty(this, "strm", void 0);
		_defineProperty(
			this,
			/**
			* Compressed result, generated by default {@link Deflate.onData}
			* and {@link Deflate.onEnd} handlers. Filled after you push last chunk
			* (call {@link Deflate.push} with {@link Z_FINISH} / `true` param).
			*/
			"result",
			void 0
		);
		this.options = Object.assign({}, defaultOptions$1, options);
		const opt = this.options;
		if (opt.raw && opt.windowBits > 0) opt.windowBits = -opt.windowBits;
		else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) opt.windowBits += 16;
		this.err = 0;
		this.msg = "";
		this.ended = false;
		this.started = false;
		this.chunks = [];
		this.result = /* @__PURE__ */ new Uint8Array(0);
		this.strm = new ZStream();
		this.strm.avail_out = 0;
		let status = deflateInit2(this.strm, opt.level, 8, opt.windowBits, opt.memLevel, opt.strategy, opt.legacyHash);
		if (status !== 0) throw new Error(messages_default[status]);
		if (toString$1.call(opt.dictionary) === "[object ArrayBuffer]") opt.dictionary = new Uint8Array(opt.dictionary);
		const dictionary = opt.dictionary;
		if (dictionary.length) {
			if (opt.gzip) throw new Error("dictionary is not supported with gzip");
			status = deflateSetDictionary(this.strm, dictionary);
			if (status !== 0) throw new Error(messages_default[status]);
		}
	}
	/**
	* Sends input data to the deflate pipe, generating {@link Deflate.onData} calls
	* with new compressed chunks. Returns `true` on success. The last data block must
	* have `flush_mode` {@link Z_FINISH} (or `true`). That will flush the internal
	* pending buffers and call {@link Deflate.onEnd}.
	*
	* On failure, calls {@link Deflate.onEnd} with the error code and returns false.
	*
	* @param data input data. Strings will be converted to utf8 byte sequence.
	* @param flush_mode 0..6 for corresponding {@link Z_NO_FLUSH}..{@link Z_TREES} modes.
	*   See constants. Skipped or `false` means {@link Z_NO_FLUSH}, `true` means {@link Z_FINISH}.
	*
	* @example
	* ```javascript
	* push(chunk, false) // push one of data chunks
	* ...
	* push(chunk, true)  // push last chunk
	* ```
	*/
	push(data, flush_mode = false) {
		const strm = this.strm;
		const chunkSize = this.options.chunkSize;
		let status;
		let _flush_mode;
		if (this.ended) return false;
		if (typeof flush_mode === "number") _flush_mode = flush_mode;
		else _flush_mode = flush_mode === true ? 4 : 0;
		if (typeof data === "string") strm.input = new TextEncoder().encode(data);
		else if (toString$1.call(data) === "[object ArrayBuffer]") strm.input = new Uint8Array(data);
		else strm.input = data;
		strm.next_in = 0;
		strm.avail_in = strm.input.length;
		if (!this.started) {
			this.started = true;
			this.onStart(strm);
		}
		for (;;) {
			if (strm.avail_out === 0) {
				strm.output = new Uint8Array(chunkSize);
				strm.next_out = 0;
				strm.avail_out = chunkSize;
			}
			if ((_flush_mode === 2 || _flush_mode === 3) && strm.avail_out <= 6) {
				this.onData(strm.output.subarray(0, strm.next_out));
				strm.avail_out = 0;
				continue;
			}
			status = deflate$1(strm, _flush_mode);
			if (status === -2) break;
			if (status === 1) {
				if (strm.next_out > 0) this.onData(strm.output.subarray(0, strm.next_out));
				status = deflateEnd(this.strm);
				break;
			}
			if (strm.avail_out === 0) {
				this.onData(strm.output);
				continue;
			}
			if (_flush_mode > 0 && strm.next_out > 0) {
				this.onData(strm.output.subarray(0, strm.next_out));
				strm.avail_out = 0;
				continue;
			}
			if (strm.avail_in === 0) return true;
		}
		this.err = status;
		this.msg = strm.msg || messages_default[status];
		this.ended = true;
		this.onEnd(status);
		return status === 0;
	}
	/**
	* Called once before the first low-level deflate call.
	*/
	onStart(strm) {}
	/**
	* By default, stores data blocks in the {@link Deflate.chunks} property and glues
	* them in {@link Deflate.onEnd}. Override this handler if you need another behaviour.
	*/
	onData(chunk) {
		this.chunks.push(chunk);
	}
	/**
	* Called once after you tell deflate that the input stream is
	* complete ({@link Z_FINISH}). By default, joins the collected {@link Deflate.chunks}
	* into the {@link Deflate.result} property.
	*
	* @param status deflate status. {@link Z_OK} on success, other if not.
	*/
	onEnd(status) {
		if (status === 0) this.result = flattenChunks(this.chunks);
		this.chunks = [];
	}
};
/**
* Compress `data` with deflate algorithm and `options`.
* See {@link DeflateOptions} for the list of supported options.
*
* @example
* ```javascript
* import { deflate } from 'pako'
*
* const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
*
* console.log(deflate(data))
* ```
*/
function deflate(input, options = {}) {
	const deflator = new Deflate(options);
	deflator.push(input, true);
	if (deflator.err) throw new Error(deflator.msg);
	return deflator.result;
}
/**
* The same as {@link deflate}, but creates raw data without a wrapper
* (header and adler32 crc).
*/
function deflateRaw(input, options = {}) {
	return deflate(input, Object.assign({}, options, { raw: true }));
}
/**
* The same as {@link deflate}, but creates a gzip wrapper instead of
* a deflate one.
*/
function gzip(input, options = {}) {
	return deflate(input, Object.assign({}, options, { gzip: true }));
}
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/objectSpread2.js
function ownKeys(e, r) {
	var t = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var o = Object.getOwnPropertySymbols(e);
		r && (o = o.filter(function(r) {
			return Object.getOwnPropertyDescriptor(e, r).enumerable;
		})), t.push.apply(t, o);
	}
	return t;
}
function _objectSpread2(e) {
	for (var r = 1; r < arguments.length; r++) {
		var t = null != arguments[r] ? arguments[r] : {};
		r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
			_defineProperty(e, r, t[r]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
			Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
		});
	}
	return e;
}
//#endregion
//#region src/inflate.ts
var toString = Object.prototype.toString;
var defaultOptions = {
	chunkSize: 1024 * 64,
	windowBits: 15,
	raw: false,
	dictionary: /* @__PURE__ */ new Uint8Array(0)
};
/**
* Generic JS-style wrapper for zlib calls. If you don't need
* streaming behaviour, use the simpler functions {@link inflate}
* and {@link inflateRaw}.
*/
var Inflate = class {
	/**
	* Creates a new inflator instance with the specified params. Throws an
	* exception on bad params. See {@link InflateOptions} for the list of
	* supported options.
	*
	* By default, when no options are set, the deflate/gzip data format is
	* autodetected via the wrapper header.
	*
	* @example
	* ```javascript
	* import { Inflate } from 'pako'
	*
	* const chunk1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
	* const chunk2 = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
	*
	* const inflate = new Inflate({ level: 3 })
	*
	* inflate.push(chunk1, false)
	* inflate.push(chunk2, true)  // true -> last chunk
	*
	* if (inflate.err) throw new Error(inflate.err)
	*
	* console.log(inflate.result)
	* ```
	*/
	constructor(options = {}) {
		_defineProperty(this, "options", void 0);
		_defineProperty(
			this,
			/**
			* Error code after inflate finishes. {@link Z_OK} on success.
			* Should be checked when broken data is possible.
			*/
			"err",
			void 0
		);
		_defineProperty(
			this,
			/** Error message, if {@link Inflate.err} is not {@link Z_OK}. */
			"msg",
			void 0
		);
		_defineProperty(
			this,
			/**
			* `true` once the compressed stream has ended. A stream may end before the
			* caller's data does (trailing bytes), so check this to know when to stop
			* pushing - further {@link Inflate.push} calls are no-ops.
			*/
			"ended",
			void 0
		);
		_defineProperty(this, "started", void 0);
		_defineProperty(
			this,
			/**
			* Chunks of output data, if {@link Inflate.onData} not overridden.
			* @internal
			*/
			"chunks",
			void 0
		);
		_defineProperty(this, "strm", void 0);
		_defineProperty(
			this,
			/**
			* Uncompressed result, generated by default {@link Inflate.onData}
			* and {@link Inflate.onEnd} handlers. Filled after you push last chunk
			* (call {@link Inflate.push} with {@link Z_FINISH} / `true` param).
			*/
			"result",
			void 0
		);
		this.options = Object.assign({}, defaultOptions, options);
		const opt = this.options;
		if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
			opt.windowBits = -opt.windowBits;
			if (opt.windowBits === 0) opt.windowBits = -15;
		}
		if (opt.windowBits >= 0 && opt.windowBits < 16 && !options.windowBits) opt.windowBits += 32;
		if (opt.windowBits > 15 && opt.windowBits < 48) {
			if ((opt.windowBits & 15) === 0) opt.windowBits |= 15;
		}
		this.err = 0;
		this.msg = "";
		this.ended = false;
		this.started = false;
		this.chunks = [];
		this.result = /* @__PURE__ */ new Uint8Array(0);
		this.strm = new ZStream();
		this.strm.avail_out = 0;
		let status = inflateInit2(this.strm, opt.windowBits);
		if (status !== 0) throw new Error(messages_default[status]);
		if (toString.call(opt.dictionary) === "[object ArrayBuffer]") opt.dictionary = new Uint8Array(opt.dictionary);
		const dictionary = opt.dictionary;
		if (opt.raw && dictionary.length) {
			status = inflateSetDictionary(this.strm, dictionary);
			if (status !== 0) throw new Error(messages_default[status]);
		}
	}
	/**
	* Sends input data to the inflate pipe, generating {@link Inflate.onData} calls
	* with new output chunks. Returns `true` on success. If end of stream is
	* detected, {@link Inflate.onEnd} will be called.
	*
	* `flush_mode` is not needed for normal operation, because end of stream
	* is detected automatically. Pass {@link Z_SYNC_FLUSH} to force the decoder
	* to emit all currently available output — handy when you need to decode
	* data frame-by-frame from a long-running stream.
	*
	* On failure, calls {@link Inflate.onEnd} with the error code and returns false.
	*
	* Once the stream has ended (a compressed stream may end before your data
	* does), further `push` calls are no-ops and return whether the decode
	* finished successfully. The final outcome is in {@link Inflate.result},
	* {@link Inflate.err} and {@link Inflate.msg}.
	*
	* @param flush_mode 0..6 for corresponding {@link Z_NO_FLUSH}..{@link Z_TREES}
	*   flush modes. See constants. Skipped or `false` means {@link Z_NO_FLUSH},
	*   `true` means {@link Z_FINISH}.
	*
	* @example
	* ```javascript
	* push(chunk, false) // push one of data chunks
	* ...
	* push(chunk, true)  // push last chunk
	* ```
	*/
	push(data, flush_mode = false) {
		const strm = this.strm;
		const chunkSize = this.options.chunkSize;
		let status;
		let _flush_mode;
		let last_avail_out;
		if (this.ended) return this.err === 0;
		if (typeof flush_mode === "number") _flush_mode = flush_mode;
		else _flush_mode = flush_mode === true ? 4 : 0;
		if (toString.call(data) === "[object ArrayBuffer]") strm.input = new Uint8Array(data);
		else strm.input = data;
		strm.next_in = 0;
		strm.avail_in = strm.input.length;
		if (!this.started) {
			this.started = true;
			this.onStart(strm);
		}
		for (;;) {
			if (strm.avail_out === 0) {
				strm.output = new Uint8Array(chunkSize);
				strm.next_out = 0;
				strm.avail_out = chunkSize;
			}
			status = inflate$1(strm, _flush_mode);
			if (status === 2) {
				const dictionary = this.options.dictionary;
				if (dictionary.length) {
					status = inflateSetDictionary(strm, dictionary);
					if (status === 0) status = inflate$1(strm, _flush_mode);
					else if (status === -3) status = 2;
				}
			}
			while (strm.avail_in > 0 && status === 1 && strm.state.wrap & 2 && strm.state.flags !== 0 && strm.input[strm.next_in] !== 0) {
				inflateReset(strm);
				status = inflate$1(strm, _flush_mode);
			}
			if (status === -2 || status === -3 || status === 2 || status === -4) break;
			last_avail_out = strm.avail_out;
			if (strm.next_out) {
				if (strm.avail_out === 0 || status === 1 || _flush_mode > 0) {
					this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
					strm.avail_out = 0;
					strm.next_out = 0;
				}
			}
			if ((status === 0 || status === -5) && last_avail_out === 0) continue;
			if (status === 1) {
				status = inflateEnd(this.strm);
				break;
			}
			if (strm.avail_in === 0) {
				if (_flush_mode === 4) {
					status = inflateEnd(this.strm);
					if (status === 0) status = -5;
					break;
				}
				return true;
			}
		}
		this.err = status;
		this.msg = strm.msg || messages_default[status];
		this.ended = true;
		this.onEnd(status);
		return status === 0;
	}
	/**
	* Called once before the first low-level inflate call.
	*
	* Override this handler to attach low-level inflate state, for example to read
	* gzip header metadata:
	*
	* ```javascript
	* import { Inflate, GZheader, zlibInflateGetHeader } from 'pako'
	*
	* const inflator = new Inflate()
	*
	* inflator.onStart = function (strm) {
	*   this.header = new GZheader()
	*   zlibInflateGetHeader(strm, this.header)
	* }
	*
	* inflator.push(data, true)
	* console.log(inflator.header.name)
	* ```
	*/
	onStart(strm) {}
	/**
	* By default, stores data blocks in the {@link Inflate.chunks} property and glues
	* them in {@link Inflate.onEnd}. Override this handler if you need another behaviour.
	*
	* @param chunk output data.
	*/
	onData(chunk) {
		this.chunks.push(chunk);
	}
	/**
	* Called after you tell inflate that the input stream is
	* complete ({@link Z_FINISH}). By default, joins the collected {@link Inflate.chunks},
	* frees memory and fills the {@link Inflate.result} property.
	*
	* @param status inflate status. {@link Z_OK} on success, other if not.
	*/
	onEnd(status) {
		if (status === 0) this.result = flattenChunks(this.chunks);
		this.chunks = [];
	}
};
/**
* One-shot inflate decompress. Autodetects `gzip`/`zlib`
* format via the wrapper header — so {@link ungzip} is just a convenience alias of
* this function. See {@link InflateOptions} for zlib options. Set
* `toText: true` to decode the result as UTF-8 text.
*
* @example
* ```javascript
* import { deflate, inflate } from 'pako'
*
* const input = deflate(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))
* let output
*
* try {
*   output = inflate(input)
* } catch (err) {
*   console.log(err)
* }
* ```
*/
function inflate(input, options = {}) {
	const inflator = new Inflate(options);
	inflator.push(input, true);
	if (inflator.err) throw new Error(inflator.msg);
	const result = inflator.result;
	return options.toText ? new TextDecoder().decode(result) : result;
}
/**
* The same as {@link inflate}, but consumes raw data without a wrapper
* (header and adler32 crc).
*/
function inflateRaw(input, options = {}) {
	return inflate(input, _objectSpread2(_objectSpread2({}, options), {}, { raw: true }));
}
//#endregion
exports.Deflate = Deflate;
exports.GZheader = GZheader;
exports.Inflate = Inflate;
exports.ZStream = ZStream;
exports.Z_BLOCK = Z_BLOCK;
exports.Z_BUF_ERROR = Z_BUF_ERROR;
exports.Z_DATA_ERROR = Z_DATA_ERROR;
exports.Z_ERRNO = Z_ERRNO;
exports.Z_FINISH = Z_FINISH;
exports.Z_FULL_FLUSH = Z_FULL_FLUSH;
exports.Z_MEM_ERROR = Z_MEM_ERROR;
exports.Z_NEED_DICT = Z_NEED_DICT;
exports.Z_NO_FLUSH = Z_NO_FLUSH;
exports.Z_OK = Z_OK;
exports.Z_PARTIAL_FLUSH = Z_PARTIAL_FLUSH;
exports.Z_STREAM_END = Z_STREAM_END;
exports.Z_STREAM_ERROR = Z_STREAM_ERROR;
exports.Z_SYNC_FLUSH = Z_SYNC_FLUSH;
exports.Z_TREES = Z_TREES;
exports.deflate = deflate;
exports.deflateRaw = deflateRaw;
exports.gzip = gzip;
exports.inflate = inflate;
exports.inflateRaw = inflateRaw;
exports.ungzip = inflate;
exports.zlibDeflate = deflate$1;
exports.zlibDeflateEnd = deflateEnd;
exports.zlibDeflateInit = deflateInit;
exports.zlibDeflateInit2 = deflateInit2;
exports.zlibDeflateReset = deflateReset;
exports.zlibDeflateResetKeep = deflateResetKeep;
exports.zlibDeflateSetDictionary = deflateSetDictionary;
exports.zlibDeflateSetHeader = deflateSetHeader;
exports.zlibInflate = inflate$1;
exports.zlibInflateEnd = inflateEnd;
exports.zlibInflateGetHeader = inflateGetHeader;
exports.zlibInflateInit = inflateInit;
exports.zlibInflateInit2 = inflateInit2;
exports.zlibInflateReset = inflateReset;
exports.zlibInflateReset2 = inflateReset2;
exports.zlibInflateResetKeep = inflateResetKeep;
exports.zlibInflateSetDictionary = inflateSetDictionary;

//# sourceMappingURL=pako.cjs.js.map