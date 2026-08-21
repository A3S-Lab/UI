#![no_std]

use core::{ptr, slice};

const INPUT_CAPACITY: usize = 4 * 1024 * 1024;
static mut INPUT: [u8; INPUT_CAPACITY] = [0; INPUT_CAPACITY];
static mut DIGEST: [u8; 32] = [0; 32];

const INITIAL: [u32; 8] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
    0x5be0cd19,
];

const ROUND: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
    0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
    0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
    0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
];

#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}

#[no_mangle]
pub extern "C" fn input_ptr() -> *mut u8 {
    ptr::addr_of_mut!(INPUT).cast::<u8>()
}

#[no_mangle]
pub extern "C" fn input_capacity() -> usize {
    INPUT_CAPACITY
}

#[no_mangle]
pub extern "C" fn engine_version() -> u32 {
    0x0001_0000
}

#[no_mangle]
pub unsafe extern "C" fn hash(length: usize) -> *const u8 {
    if length > INPUT_CAPACITY {
        return ptr::null();
    }
    let input = slice::from_raw_parts(ptr::addr_of!(INPUT).cast::<u8>(), length);
    let digest = sha256(input);
    ptr::copy_nonoverlapping(digest.as_ptr(), ptr::addr_of_mut!(DIGEST).cast::<u8>(), 32);
    ptr::addr_of!(DIGEST).cast::<u8>()
}

fn sha256(input: &[u8]) -> [u8; 32] {
    let mut state = INITIAL;
    let bit_length = (input.len() as u64) * 8;
    let padded_length = (input.len() + 9 + 63) & !63;
    let blocks = padded_length / 64;

    for block_index in 0..blocks {
        let mut schedule = [0u32; 64];
        for word_index in 0..16 {
            let mut word = 0u32;
            for byte_index in 0..4 {
                let offset = block_index * 64 + word_index * 4 + byte_index;
                let byte = if offset < input.len() {
                    input[offset]
                } else if offset == input.len() {
                    0x80
                } else if offset >= padded_length - 8 {
                    let shift = (padded_length - 1 - offset) * 8;
                    ((bit_length >> shift) & 0xff) as u8
                } else {
                    0
                };
                word = (word << 8) | byte as u32;
            }
            schedule[word_index] = word;
        }

        for index in 16..64 {
            let x = schedule[index - 15];
            let y = schedule[index - 2];
            let sigma0 = x.rotate_right(7) ^ x.rotate_right(18) ^ (x >> 3);
            let sigma1 = y.rotate_right(17) ^ y.rotate_right(19) ^ (y >> 10);
            schedule[index] = schedule[index - 16]
                .wrapping_add(sigma0)
                .wrapping_add(schedule[index - 7])
                .wrapping_add(sigma1);
        }

        let mut a = state[0];
        let mut b = state[1];
        let mut c = state[2];
        let mut d = state[3];
        let mut e = state[4];
        let mut f = state[5];
        let mut g = state[6];
        let mut h = state[7];

        for index in 0..64 {
            let sum1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choose = (e & f) ^ ((!e) & g);
            let temp1 = h
                .wrapping_add(sum1)
                .wrapping_add(choose)
                .wrapping_add(ROUND[index])
                .wrapping_add(schedule[index]);
            let sum0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = sum0.wrapping_add(majority);

            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        state[0] = state[0].wrapping_add(a);
        state[1] = state[1].wrapping_add(b);
        state[2] = state[2].wrapping_add(c);
        state[3] = state[3].wrapping_add(d);
        state[4] = state[4].wrapping_add(e);
        state[5] = state[5].wrapping_add(f);
        state[6] = state[6].wrapping_add(g);
        state[7] = state[7].wrapping_add(h);
    }

    let mut output = [0u8; 32];
    for (index, word) in state.iter().enumerate() {
        output[index * 4..index * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    output
}
