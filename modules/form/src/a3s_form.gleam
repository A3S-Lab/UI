import gleam/int

pub const repository = "A3S-Lab/UI"

pub const package = "@a3s-lab/ui/form"

pub const product = "AI Native Form Designer"

pub const storage_namespace = "a3s-form-workspace:v1"

pub type DocumentVersion {
  DocumentVersion(major: Int, minor: Int, patch: Int)
  Development
}

pub type WorkspaceView {
  FormList
  FormEditor(form_id: String)
}

pub type DocumentLocation {
  BrowserLocal
  Cloud(workspace_id: String)
}

pub fn current_version() -> DocumentVersion {
  DocumentVersion(0, 1, 0)
}

pub fn version_label(version: DocumentVersion) -> String {
  case version {
    DocumentVersion(major, minor, patch) ->
      "v" <> int.to_string(major) <> "." <> int.to_string(minor) <> "." <>
        int.to_string(patch)
    Development -> "next"
  }
}

pub fn is_local(location: DocumentLocation) -> Bool {
  case location {
    BrowserLocal -> True
    Cloud(_) -> False
  }
}
