use std::{ptr, slice};

use a3s_form_core::{
    compile_bytes, evaluate_bytes, ABSOLUTE_MAX_REQUEST_BYTES, ABSOLUTE_MAX_RESPONSE_BYTES,
};

static mut INPUT: [u8; ABSOLUTE_MAX_REQUEST_BYTES] = [0; ABSOLUTE_MAX_REQUEST_BYTES];
static mut OUTPUT: [u8; ABSOLUTE_MAX_RESPONSE_BYTES] = [0; ABSOLUTE_MAX_RESPONSE_BYTES];

#[no_mangle]
pub extern "C" fn engine_version() -> u32 {
    0x0001_0000
}

#[no_mangle]
pub extern "C" fn compiler_version() -> u32 {
    0x0000_0100
}

#[no_mangle]
pub extern "C" fn input_ptr() -> *mut u8 {
    ptr::addr_of_mut!(INPUT).cast::<u8>()
}

#[no_mangle]
pub extern "C" fn input_capacity() -> usize {
    ABSOLUTE_MAX_REQUEST_BYTES
}

#[no_mangle]
pub extern "C" fn output_ptr() -> *const u8 {
    ptr::addr_of!(OUTPUT).cast::<u8>()
}

#[no_mangle]
pub extern "C" fn output_capacity() -> usize {
    ABSOLUTE_MAX_RESPONSE_BYTES
}

/// Compiles the bytes previously copied to `input_ptr` and returns the output
/// byte length. A zero length indicates an internal adapter failure.
///
/// # Safety
///
/// The caller must copy `length` initialized bytes into the memory starting at
/// `input_ptr` and must not mutate that memory until this call returns.
#[no_mangle]
pub unsafe extern "C" fn compile_request(length: usize) -> usize {
    unsafe { process_request(length, compile_bytes) }
}

/// Evaluates the bytes previously copied to `input_ptr` and returns the output
/// byte length. A zero length indicates an internal adapter failure.
///
/// # Safety
///
/// The caller must copy `length` initialized bytes into the memory starting at
/// `input_ptr` and must not mutate that memory until this call returns.
#[no_mangle]
pub unsafe extern "C" fn evaluate_request(length: usize) -> usize {
    unsafe { process_request(length, evaluate_bytes) }
}

unsafe fn process_request<E>(length: usize, processor: fn(&[u8]) -> Result<Vec<u8>, E>) -> usize {
    if length > ABSOLUTE_MAX_REQUEST_BYTES {
        return 0;
    }
    let input = unsafe { slice::from_raw_parts(ptr::addr_of!(INPUT).cast::<u8>(), length) };
    let Ok(response) = processor(input) else {
        return 0;
    };
    if response.len() > ABSOLUTE_MAX_RESPONSE_BYTES {
        return 0;
    }
    unsafe {
        ptr::copy_nonoverlapping(
            response.as_ptr(),
            ptr::addr_of_mut!(OUTPUT).cast::<u8>(),
            response.len(),
        );
    }
    response.len()
}
