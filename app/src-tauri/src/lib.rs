#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default();

  // Enforce a single running instance on desktop. A second launch hands its
  // args to this callback (instead of opening a new window) and exits — we just
  // focus the existing window. This is what guarantees one window per PC: two
  // windows would each run the cashier auto-print poller and print every ticket
  // twice. Per Tauri's requirement, single-instance must be the FIRST plugin
  // registered.
  #[cfg(not(any(target_os = "android", target_os = "ios")))]
  let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
      let _ = window.unminimize();
      let _ = window.show();
      let _ = window.set_focus();
    }
  }));

  let builder = builder
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_thermal_printer::init());

  // The updater + process plugins are desktop-only; mobile builds skip them.
  #[cfg(not(any(target_os = "android", target_os = "ios")))]
  let builder = builder
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init());

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
