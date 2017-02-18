/// <reference path="../../harness.ts" />
/// <reference path="decoder.ts" />
/// <reference path="../../../compiler/transformers/wasm/encoder.ts" />

namespace ts.wasm {
    /** Returns an array containing the values of 'numbers' in ascending order. */
    function sort(numbers: number[]) {
        return numbers.sort((left, right) => left - right);
    }

    /** Returns the minimum value contained in the given array of numbers. */
    function min(numbers: number[]) {
        return numbers.reduce((left, right) => Math.min(left, right));
    }

    /** Returns the maximum value contained in the given array of numbers. */
    function max(numbers: number[]) {
        return numbers.reduce((left, right) => Math.max(left, right));
    }

    describe("wasm", () => {
        describe("binary encoding", () => {
            /**
             * If the given 'value' passes the 'is_valid' predicate, checks that the value
             * round-trips through encode/decode.  Otherwise, checks that attempting to encode
             * the value throws the appropriate error.
             */
            function check_numeric(value: number, is_valid: (value: number) => boolean, encode: (value: number) => void, decode: () => number) {
                if (is_valid(value)) {                                      // If the value is in the valid range..
                    it(`must round-trip value ${value}`, () => {
                        encode(value);                                      //   encode the value
                        const actual = decode();                            //   decode the value
                        assert.equal(actual, value);                        //   and ensure the decoded value is equal to the original.
                    });
                }
                else {                                                      // If the value is outside the range [lower..upper] ..
                    it(`must throw an error for out of range value ${value}`, () => {
                        assert.throws(() => {                               //   attempting to encode the value must throw an error.
                            encode(value);
                        }, "'value' must be a");
                    });
                }
            }

            /**
             * For the enum type with the specified 'name', ensures that all defined values correctly
             * round-trip through encoding/decoding.  Also sanity checks that values just outside the
             * defined range do not round-trip.
             */
            function check_enum(name: string) {
                describe(name, () => {
                    // Create a pair of encoder/decoders to test that we can round-trip values as expected.
                    const encoder = new Encoder();
                    const decoder = new Decoder(encoder.buffer);

                    // Lookup the encode/decode and is_* functions we want to test by 'name'.
                    const fixture: any = (<any>ts.wasm)[name];
                    const encode: (value: number) => void = ((<any>encoder)[name]).bind(encoder);
                    const decode: () => number = ((<any>decoder)[name]).bind(decoder);
                    const is_valid: (value: number) => boolean = (<any>ts.wasm)["is_" + name];

                    // Get the set of defined values for the enum.
                    const values = Object.keys(fixture)                             // For each enumerable property of the enum Object,
                        .map(key => fixture[key])                                   //   get the value for each property name
                        .filter(value => typeof value === "number") as number[];    //   keeping only values that are of type number.

                    const cases = sort(values.concat(
                        min(values) - 1,                            // Also test a value that is one less that smallest given value.
                        max(values) + 1                             // and one that is one greater to ensure invalid values throw.
                    ));

                    cases.forEach((expected) => check_numeric(expected, is_valid, encode, decode));
                });
            }

            /** Ensures that the given 'original' instance of a Section round-trips through encoding/decoding
                functions with the given 'name'.  Succeeds if the decoded copy is deeply equal to the original.
                The decoded copy is returned for further verification. */
            function check_section<T extends Section>(name: string, original: T) {
                const encoder = new Encoder();

                // Lookup the encode functions we want to test by 'name'.
                const encode: (section: T) => void = ((<any>encoder)[name]).bind(encoder);

                encode(original);

                const decoder = new Decoder(encoder.buffer);
                const replica = decoder.section();

                assert.deepEqual(original, replica);

                return replica;
            }

            describe("data types", () => {
                const numeric_types = [                                 // Description of the various numeric types/encodings
                    { variable: false, signed: false, bits: 8 },        //
                    { variable: false, signed: false, bits: 32 },       //  variable:   True if LEB128 encoded, otherwise LE.
                    { variable: true, signed: false, bits: 1 },         //  signed:     True if signed, otherwise unsigned.
                    { variable: true, signed: false, bits: 7 },         //  bits:       Number of bits (prior to encoding).
                    { variable: true, signed: false, bits: 32 },
                    { variable: true, signed: true, bits: 7 },
                    { variable: true, signed: true, bits: 32 }
                ];

                // Points at which signed and unsigned LEB128 encoding extends to an extra byte.
                // (e.g., 0x3F is the largest signed value that LEB128 can encode as a single byte)
                const leb128Cases = [
                    0x3F, 0x7F, 0x1FFF, 0x3FFF, 0xFFFFF, 0x1FFFFF, 0x7FFFFFF, 0x0FFFFFFF
                ];

                // Test each positive boundary at which signed or unsigned encoding extends to another
                // byte (e.g., 0x7F is 1 byte, 0x80 is 2 bytes).  Note that because 'leb128Cases' contains
                // transitions both signed and unsigned encoding, we are testing some non-transitions
                // as well.
                const unsignedCases = leb128Cases                       // Include maximum values for each encoded length
                    .concat(leb128Cases.map(value => value + 1))        // ...and minimum values for each encoded length.

                // Test each negative boundary at which signed encoding extends to another byte.
                const signedCases = unsignedCases
                    .concat(leb128Cases.map(value => -value - 1))       // Include minimum values for each encoded length
                    .concat(leb128Cases.map(value => -value - 2))       // ...and maximum negative value for each encoded length.
                    .concat([-1, 0, 1]);

                numeric_types.forEach(type => {
                    const name =            // Calculate the name of the encode fn for the current type (e.g., 'varuint7')
                        (type.variable      //   If the encoding is variable lenght, add the "var" prefix.
                            ? "var"
                            : "") +
                        (type.signed        //   If the type is signed, add "int".  Otherwise "uint".
                            ? "int"
                            : "uint") +
                        type.bits;          //   Append the number of bits.

                    describe(name, () => {
                        // Create a pair of encoder/decoders to test that we can round-trip values as expected.
                        const encoder = new Encoder();
                        const decoder = new Decoder(encoder.buffer);

                        // Lookup the encode/decode functions we want to test by 'name'.
                        const encode: (value: number) => void = ((<any>encoder)[name]).bind(encoder);
                        const decode: () => number = ((<any>decoder)[name]).bind(decoder);

                        // Note: Use Math.pow() to calculate powers of 2 to avoid pitfall of left-shifting
                        //       a 32b integer by 32.
                        const lowerBound = type.signed                                  // Calculate the lower bound for the given number of bits.
                            ? -Math.pow(2, type.bits - 1)                               //   Lower bound of a signed integer is 2^(N-1)
                            : 0;                                                        //   Lower bound of an unsigned integer is always 0.
                        const upperBound = type.signed                                  // Calculate the upper bound for the given number of bits.
                            ? Math.pow(2, type.bits - 1) - 1                            //   Upper bound of a signed integer is 2^(N-1) - 1.
                            : Math.pow(2, type.bits) - 1                                //   Upper bound of an unsigned integer is 2^N - 1.

                        const is_valid = (value: number) => lowerBound <= value && value <= upperBound;

                        const cases =
                            sort((type.signed                                           // Select the signed or unsigned test cases.
                                ? signedCases
                                : unsignedCases)
                            .concat([lowerBound - 1, lowerBound])                       //   and add values that straddle the lower and
                            .concat([upperBound, upperBound + 1]));                     //   upper bounds.

                        cases.forEach(value => check_numeric(value, is_valid, encode, decode)); // Ensure that each value correctly round-trips.
                    });
                });
            });  // end data types

            describe("language types", () => {
                check_enum("type");
                check_enum("value_type");

                describe("func_type", () => {
                    // Encoding/Decoding of the 'func_type' is verified by the 'type section' round-trip tests.
                    //
                    // We do not test Encoding/Decoding of 'func_type' directly because the encoding/decoding is
                    // unbalanced.  In particular, the 'form' field is written by 'Encoder.func_type()', but is
                    // presumed to already have been consumed by the time we get to 'Decoder.func_type()'.

                    it("must disallow multiple return values", () => {
                        assert.throws(() => {
                            new FuncType(
                                /* parameters = */ [],
                                /* returns = */  [ value_type.i32, value_type.i32 ]
                            );
                        });
                    });
                });
            }); // End language types

            describe("other types", () => {
                check_enum("external_kind");
            }); // End other types

            describe("module structure", () => {
                describe("preamble", () => {
                    const magic_number = [ 0x00, 0x61, 0x73, 0x6d];         // First 4 bytes of a module must begin with '\0asm' (little endian).
                    const version = 0x0d;                                   // Current version number, will reset to 1 for MVP.

                    it("constructor must require a supported version number", () => {
                        const preamble = new Preamble(version);      // A valid version number must be accepted.
                        assert.equal(preamble.version, version);

                        assert.throws(() => {                               // An invalid version number must be rejected.
                            new Preamble(0xBADADABA);
                        }, "Unsupported version");
                    });

                    it("must start with magic namber followed by version", () => {
                        const encoder = new Encoder();
                        encoder.module_preamble(new Preamble(version));

                        // Check that the encoded byte stream begins with the expected magic number.
                        assert.deepEqual(encoder.buffer.slice(0, 4),  magic_number,
                            "preamble must start with magic number 0x6d736100. (i.e., '\0asm')");

                        // Decoder must accept the encoded byte stream, which we've already vetted to
                        // start with the expected magic number.
                        const preamble = new Decoder(encoder.buffer).module_preamble();
                        assert.equal(preamble.version, version);

                        // Decoder must reject the preamble if it does not start with the magic number.
                        assert.throws(() => {
                            new Decoder([0xBA, 0xDA, 0xDA, 0xBA]).module_preamble();
                        }, "0x6d736100");
                    });

                    it("Decoder must throw if given an unsupported version number", () => {
                        const decoder = new Decoder(magic_number.concat([0xBA, 0xDA, 0xDA, 0xBA]));
                        assert.throws(() => {
                            decoder.module_preamble();
                        }, "Unsupported version");
                    });
                });

                check_enum("section_code");

                describe("custom section", () => {
                    it("must permit a zero-length name and payload", () => {
                        check_section("custom_section", new CustomSection([], []));
                    });

                    it("must round-trip name and payload", () => {
                        check_section("custom_section", new CustomSection(
                            [0x6e, 0x61, 0x6d, 0x65],                       // "name"
                            [0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64]));   // "payload"
                    });
                });

                describe("type section", () => {
                    // Note that this test also serves to cover round-tripping of 'func_type'.  (See notes in 'func_type' test above.)
                    const signatures = [
                        new FuncType([], []),                                   // No parameters or return type.
                        new FuncType([ value_type.f64 ], []),                   // Single parameter, no return type.
                        new FuncType([], [ value_type.i32 ]),                   // No parameter, returns value.
                        new FuncType(                                           // Multiple parameters, different return value type.
                            [ value_type.i64, value_type.f64, value_type.f32, value_type.i32 ],
                            [ value_type.f64 ])
                    ];

                    // It would be better to omit the section, but to my knowledge nothing precludes an empty type section.
                    it(`must round-trip an empty type section`, () => {
                        check_section("type_section", new TypeSection());
                    });

                    // Ensure that each of the 'func_type' signatures above round-trip individually.
                    signatures.forEach(signature => {
                        it(`must round-trip ${signature.param_types.length} params/${signature.return_types.length} return values`, () => {
                            const types = new TypeSection();
                            types.add(signature);
                            check_section("type_section", types);
                        });
                    });

                    // Ensure that the type section round-trips multiple signatures.
                    it("must round-trip multiple signatures", () => {
                        const types = new TypeSection();
                        signatures.forEach(signature => {
                            types.add(signature);
                        });
                        check_section("type_section", types);
                    });
                });
            }); // End module structure
        });
    });
}