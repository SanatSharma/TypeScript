/// <reference path="../../harness.ts" />
/// <reference path="decoder.ts" />
/// <reference path="../../../compiler/transformers/wasm/encoder.ts" />

namespace ts.wasm {
    describe("wasm", () => {
        describe("encoder", () => {
            describe("data types", () => {
                const types = [
                    { variable: false, signed: false, bits: 8 },
                    { variable: false, signed: false, bits: 32 },
                    { variable: true, signed: false, bits: 1 },
                    { variable: true, signed: false, bits: 7 },
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

                types.forEach(type => {
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
                        const decoder = new Decoder(encoder.bytes);

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

                        const check = (expected: number) => {
                            if (lowerBound <= expected && expected <= upperBound) {     //   If the value is in the range [lower..upper] inclusive..
                                it(`must round-trip value ${expected}`, () => {
                                    encode(expected);                                   //     encode the value
                                    const actual = decode();                            //     decode the value
                                    assert.equal(actual, expected);                     //     and ensure the decoded value is equal to the original.
                                });
                            } else {                                                    //   If the value is outside the range [lower..upper] ..
                                it(`must throw an error for out of range value ${expected}`, () => {
                                    assert.throws(() => {                               //     attempting to encode the value must throw an error.
                                        encode(expected);                                   
                                    }, `'value' must be a`);
                                });
                            }
                        };

                        const cases =
                            (type.signed                                                // Select the signed or unsigned test cases.
                                ? signedCases
                                : unsignedCases)
                            .concat([lowerBound - 1, lowerBound])                       //   and add values that straddle the lower and
                            .concat([upperBound, upperBound + 1])                       //   upper bounds.
                            .sort((left, right) => left - right);

                        cases.forEach(value => check(value));                           // Ensure that each value correctly round-trips.
                    });
                });
            });
        });
    });        
}