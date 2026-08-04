/** @category constants */
type Z_FlushMode =
  | typeof Z_NO_FLUSH
  | typeof Z_PARTIAL_FLUSH
  | typeof Z_SYNC_FLUSH
  | typeof Z_FULL_FLUSH
  | typeof Z_FINISH
  | typeof Z_BLOCK
  | typeof Z_TREES;

/** @category constants */
type Z_CallStatus =
  | typeof Z_OK
  | typeof Z_STREAM_END
  | typeof Z_NEED_DICT
  | typeof Z_ERRNO
  | typeof Z_STREAM_ERROR
  | typeof Z_DATA_ERROR
  | typeof Z_MEM_ERROR
  | typeof Z_BUF_ERROR;

/** @category zlib */
declare class ZStream {
  input: Uint8Array;
  next_in: number;
  avail_in: number;
  total_in: number;
  output: Uint8Array<ArrayBuffer>;
  next_out: number;
  avail_out: number;
  total_out: number;
  msg: string;
  state: any;
  data_type: number;
  adler: number;
}

/** @category zlib */
declare class GZheader {
  text: number;
  time: number;
  xflags: number;
  os: number;
  extra: Uint8Array | number[] | null;
  extra_len: number;
  name: string | null;
  comment: string | null;
  hcrc: boolean;
  done: boolean;
}

/** @category zlib */
declare function zlibDeflateInit(strm: ZStream, level: number): Z_CallStatus;
/** @category zlib */
declare function zlibDeflateInit2(
  strm: ZStream,
  level: number,
  method: number,
  windowBits: number,
  memLevel: number,
  strategy: number,
  legacyHash?: boolean
): Z_CallStatus;
/** @category zlib */
declare function zlibDeflateReset(strm: ZStream): Z_CallStatus;
/** @category zlib */
declare function zlibDeflateResetKeep(strm: ZStream): Z_CallStatus;
/** @category zlib */
declare function zlibDeflateSetHeader(strm: ZStream, head: GZheader): Z_CallStatus;
/** @category zlib */
declare function zlibDeflateSetDictionary(strm: ZStream, dictionary: Uint8Array): Z_CallStatus;
/** @category zlib */
declare function zlibDeflate(strm: ZStream, flush: Z_FlushMode): Z_CallStatus;
/** @category zlib */
declare function zlibDeflateEnd(strm: ZStream): Z_CallStatus;

/** @category zlib */
declare function zlibInflateReset(strm: ZStream): Z_CallStatus;
/** @category zlib */
declare function zlibInflateReset2(strm: ZStream, windowBits: number): Z_CallStatus;
/** @category zlib */
declare function zlibInflateResetKeep(strm: ZStream): Z_CallStatus;
/** @category zlib */
declare function zlibInflateInit(strm: ZStream): Z_CallStatus;
/** @category zlib */
declare function zlibInflateInit2(strm: ZStream, windowBits: number): Z_CallStatus;
/** @category zlib */
declare function zlibInflateGetHeader(strm: ZStream, head: GZheader): Z_CallStatus;
/** @category zlib */
declare function zlibInflateSetDictionary(strm: ZStream, dictionary: Uint8Array): Z_CallStatus;
/** @category zlib */
declare function zlibInflate(strm: ZStream, flush: Z_FlushMode): Z_CallStatus;
/** @category zlib */
declare function zlibInflateEnd(strm: ZStream): Z_CallStatus;

/** @category constants */
declare const Z_NO_FLUSH: 0;
/** @category constants */
declare const Z_PARTIAL_FLUSH: 1;
/** @category constants */
declare const Z_SYNC_FLUSH: 2;
/** @category constants */
declare const Z_FULL_FLUSH: 3;
/** @category constants */
declare const Z_FINISH: 4;
/** @category constants */
declare const Z_BLOCK: 5;
/** @category constants */
declare const Z_TREES: 6;

/** @category constants */
declare const Z_OK: 0;
/** @category constants */
declare const Z_STREAM_END: 1;
/** @category constants */
declare const Z_NEED_DICT: 2;
/** @category constants */
declare const Z_ERRNO: -1;
/** @category constants */
declare const Z_STREAM_ERROR: -2;
/** @category constants */
declare const Z_DATA_ERROR: -3;
/** @category constants */
declare const Z_MEM_ERROR: -4;
/** @category constants */
declare const Z_BUF_ERROR: -5;

/** @inline */
type DeflateInput = Uint8Array | ArrayBuffer | string;
interface DeflateOptions {
    /**
     * Compression level. See the
     * [zlib manual](http://zlib.net/manual.html#Advanced) for more information.
     * @group zlib options
     */
    level?: number;
    /**
     * Size of generated data chunks (16K by default).
     * @group Extensions
     */
    chunkSize?: number;
    /**
     * Window size. See the
     * [zlib manual](http://zlib.net/manual.html#Advanced) for more information.
     * @group zlib options
     */
    windowBits?: number;
    /**
     * Memory level. See the
     * [zlib manual](http://zlib.net/manual.html#Advanced) for more information.
     * @group zlib options
     */
    memLevel?: number;
    /**
     * Compression strategy. See the
     * [zlib manual](http://zlib.net/manual.html#Advanced) for more information.
     * @group zlib options
     */
    strategy?: number;
    /**
     * Do raw deflate. Say that we work with raw stream, if you don't wish to
     * specify negative `windowBits` implicitly.
     * @group Extensions
     */
    raw?: boolean;
    /**
     * Create gzip wrapper.
     * @group Extensions
     */
    gzip?: boolean;
    /**
     * Initial dictionary. See the
     * [zlib manual](http://zlib.net/manual.html#Advanced) for more information.
     * @group zlib options
     */
    dictionary?: Uint8Array | ArrayBuffer;
    /**
     * Set to `true` to use the classic zlib hash, which matches canonical zlib
     * output byte-for-byte. The default `false` uses the faster ANZAC++ hash,
     * which matches recent (chromium) node.js output instead.
     * @group Extensions
     */
    legacyHash?: boolean;
}
/**
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour, use the simpler functions {@link deflate},
 * {@link deflateRaw} and {@link gzip}.
 */
declare class Deflate {
    private options;
    /**
     * Error code after deflate finishes. {@link Z_OK} on success.
     * You will not need it in real life, because deflate errors
     * are possible only on wrong options or bad custom `onData` / `onEnd`
     * handlers.
     */
    err: Z_CallStatus;
    /** Error message, if {@link Deflate.err} is not {@link Z_OK}. */
    msg: string;
    private ended;
    private started;
    /**
     * Chunks of output data, if {@link Deflate.onData} not overridden.
     * @internal
     */
    chunks: Uint8Array<ArrayBuffer>[];
    private strm;
    /**
     * Compressed result, generated by default {@link Deflate.onData}
     * and {@link Deflate.onEnd} handlers. Filled after you push last chunk
     * (call {@link Deflate.push} with {@link Z_FINISH} / `true` param).
     */
    result: Uint8Array<ArrayBuffer>;
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
    constructor(options?: DeflateOptions);
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
    push(data: DeflateInput, flush_mode?: Z_FlushMode | boolean): boolean;
    /**
     * Called once before the first low-level deflate call.
     */
    onStart(strm: ZStream): void;
    /**
     * By default, stores data blocks in the {@link Deflate.chunks} property and glues
     * them in {@link Deflate.onEnd}. Override this handler if you need another behaviour.
     */
    onData(chunk: Uint8Array<ArrayBuffer>): void;
    /**
     * Called once after you tell deflate that the input stream is
     * complete ({@link Z_FINISH}). By default, joins the collected {@link Deflate.chunks}
     * into the {@link Deflate.result} property.
     *
     * @param status deflate status. {@link Z_OK} on success, other if not.
     */
    onEnd(status: Z_CallStatus): void;
}
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
declare function deflate(input: DeflateInput, options?: DeflateOptions): Uint8Array<ArrayBuffer>;
/**
 * The same as {@link deflate}, but creates raw data without a wrapper
 * (header and adler32 crc).
 */
declare function deflateRaw(input: DeflateInput, options?: DeflateOptions): Uint8Array<ArrayBuffer>;
/**
 * The same as {@link deflate}, but creates a gzip wrapper instead of
 * a deflate one.
 */
declare function gzip(input: DeflateInput, options?: DeflateOptions): Uint8Array<ArrayBuffer>;

/** @inline */
type InflateInput = Uint8Array | ArrayBuffer;
interface InflateOptions {
    /**
     * Window size. See the
     * [zlib manual](http://zlib.net/manual.html#Advanced) for more information.
     * @group zlib options
     */
    windowBits?: number;
    /**
     * Initial dictionary. See the
     * [zlib manual](http://zlib.net/manual.html#Advanced) for more information.
     * @group zlib options
     */
    dictionary?: Uint8Array | ArrayBuffer;
    /**
     * Size of generated data chunks (64K by default).
     * @group Extensions
     */
    chunkSize?: number;
    /**
     * Do raw inflate. Say that we work with raw stream, if you don't wish to
     * specify negative `windowBits` implicitly.
     * @group Extensions
     */
    raw?: boolean;
}
/**
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour, use the simpler functions {@link inflate}
 * and {@link inflateRaw}.
 */
declare class Inflate {
    private options;
    /**
     * Error code after inflate finishes. {@link Z_OK} on success.
     * Should be checked when broken data is possible.
     */
    err: Z_CallStatus;
    /** Error message, if {@link Inflate.err} is not {@link Z_OK}. */
    msg: string;
    /**
     * `true` once the compressed stream has ended. A stream may end before the
     * caller's data does (trailing bytes), so check this to know when to stop
     * pushing - further {@link Inflate.push} calls are no-ops.
     */
    ended: boolean;
    private started;
    /**
     * Chunks of output data, if {@link Inflate.onData} not overridden.
     * @internal
     */
    chunks: Uint8Array<ArrayBuffer>[];
    private strm;
    /**
     * Uncompressed result, generated by default {@link Inflate.onData}
     * and {@link Inflate.onEnd} handlers. Filled after you push last chunk
     * (call {@link Inflate.push} with {@link Z_FINISH} / `true` param).
     */
    result: Uint8Array<ArrayBuffer>;
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
    constructor(options?: InflateOptions);
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
    push(data: InflateInput, flush_mode?: Z_FlushMode | boolean): boolean;
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
    onStart(strm: ZStream): void;
    /**
     * By default, stores data blocks in the {@link Inflate.chunks} property and glues
     * them in {@link Inflate.onEnd}. Override this handler if you need another behaviour.
     *
     * @param chunk output data.
     */
    onData(chunk: Uint8Array<ArrayBuffer>): void;
    /**
     * Called after you tell inflate that the input stream is
     * complete ({@link Z_FINISH}). By default, joins the collected {@link Inflate.chunks},
     * frees memory and fills the {@link Inflate.result} property.
     *
     * @param status inflate status. {@link Z_OK} on success, other if not.
     */
    onEnd(status: Z_CallStatus): void;
}
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
declare function inflate<O extends InflateOptions & {
    toText?: boolean;
}>(input: InflateInput, options?: O): O extends {
    toText: true;
} ? string : Uint8Array<ArrayBuffer>;
/**
 * The same as {@link inflate}, but consumes raw data without a wrapper
 * (header and adler32 crc).
 */
declare function inflateRaw<O extends InflateOptions & {
    toText?: boolean;
}>(input: InflateInput, options?: O): O extends {
    toText: true;
} ? string : Uint8Array<ArrayBuffer>;

export { Deflate, GZheader, Inflate, ZStream, Z_BLOCK, Z_BUF_ERROR, Z_DATA_ERROR, Z_ERRNO, Z_FINISH, Z_FULL_FLUSH, Z_MEM_ERROR, Z_NEED_DICT, Z_NO_FLUSH, Z_OK, Z_PARTIAL_FLUSH, Z_STREAM_END, Z_STREAM_ERROR, Z_SYNC_FLUSH, Z_TREES, deflate, deflateRaw, gzip, inflate, inflateRaw, inflate as ungzip, zlibDeflate, zlibDeflateEnd, zlibDeflateInit, zlibDeflateInit2, zlibDeflateReset, zlibDeflateResetKeep, zlibDeflateSetDictionary, zlibDeflateSetHeader, zlibInflate, zlibInflateEnd, zlibInflateGetHeader, zlibInflateInit, zlibInflateInit2, zlibInflateReset, zlibInflateReset2, zlibInflateResetKeep, zlibInflateSetDictionary };
export type { DeflateOptions, InflateOptions, Z_CallStatus, Z_FlushMode };
