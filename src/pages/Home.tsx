import { useState, useEffect } from "react";

const API_URL = "http://localhost:3000";

export const Home = () => {
  const [data, setData] = useState<string>("Loading...");

  useEffect(() => {
    const getHome = async () => {
      try {
        const res = await fetch(`${API_URL}/`);
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          setData(JSON.stringify(json, null, 2));
        } catch {
          setData(text);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setData(`Error: ${err.message}`);
        } else {
          setData(`Unexpected error: ${String(err)}`);
        }
      }
    };

    getHome();
  }, []);

  return (
    <div className="page-container">
      <h1>Home Page</h1>
      <p>Welcome to the Strata Reserve Planning (SRP) Web Application.</p>

      <div className="response-area">
        <h3>Response:</h3>
        <pre>{data}</pre>
      </div>
    </div>
  );
};
