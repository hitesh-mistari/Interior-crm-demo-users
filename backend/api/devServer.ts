import 'dotenv/config';
import { app } from './index.ts';

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Express API running on http://localhost:${port}`);
});
