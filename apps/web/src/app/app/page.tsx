import { AppChrome } from "@/components/app-chrome";
import { BlockRow } from "@/components/block-row";
import { appHome } from "@/content/app-home";

export default function AppHomePage() {
  return (
    <AppChrome>
      <div className="app-feed">
        {appHome.rows.map((row) => (
          <div key={row.id} id={row.id}>
            <BlockRow row={row} />
          </div>
        ))}
      </div>
    </AppChrome>
  );
}
