import { open } from "@tauri-apps/plugin-dialog";
import { useApp } from "../store";
import { t } from "../lib/strings";

/** "Obter dados > Texto/CSV": pick a file and load it. */
export async function getDataFromCsv() {
  const path = await open({
    multiple: false,
    filters: [{ name: t.ribbon.textCsv, extensions: ["csv", "txt"] }],
  });
  if (typeof path === "string") {
    await useApp.getState().importCsv(path);
  }
}
