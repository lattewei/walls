import { AppChrome } from "@/components/app-chrome";
import { BlockRow } from "@/components/block-row";
import { appHome } from "@/content/app-home";

export default function AppHomePage() {
  return (
    <AppChrome>
      {appHome.rows.map((row) => (
        <BlockRow key={row.id} row={row} />
      ))}
    </AppChrome>
  );
}
