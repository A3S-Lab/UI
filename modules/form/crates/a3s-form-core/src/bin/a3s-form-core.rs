use std::env;
use std::io::{self, Read, Write};
use std::process::ExitCode;

use a3s_form_core::{
    canonicalize_json, compile_bytes, digest_document_json, evaluate_bytes,
    ABSOLUTE_MAX_REQUEST_BYTES,
};

type BoxError = Box<dyn std::error::Error + Send + Sync>;

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("a3s-form-core: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), BoxError> {
    let mut arguments = env::args();
    let _program = arguments.next();
    let command = arguments.next().ok_or(
        "missing command; expected `canonicalize`, `digest-document`, `compile`, or `evaluate`",
    )?;
    if arguments.next().is_some() {
        return Err("unexpected command arguments".into());
    }

    let mut input = Vec::new();
    io::stdin()
        .take((ABSOLUTE_MAX_REQUEST_BYTES + 1) as u64)
        .read_to_end(&mut input)?;

    let output = match command.as_str() {
        "canonicalize" => canonicalize_json(&input)?,
        "compile" => compile_bytes(&input)?,
        "evaluate" => evaluate_bytes(&input)?,
        "digest-document" => {
            let mut digest = digest_document_json(&input)?.into_bytes();
            digest.push(b'\n');
            digest
        }
        _ => return Err(format!("unsupported command {command:?}").into()),
    };
    io::stdout().write_all(&output)?;
    Ok(())
}
