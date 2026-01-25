import { useState, useEffect } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';

const API_URL = 'http://localhost:3000';

export const Profile = () => {
    const [data, setData] = useState<string>("Loading...");
    const authFetch = useAuthFetch();

    useEffect(() => {
        const getProfile = async () => {
            try {
                const res = await authFetch(`${API_URL}/profile`);
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    setData(JSON.stringify(json, null, 2));
                } catch {
                    setData(text);
                }
            } catch (err: any) {
                setData(`Error: ${err.message}`);
            }
        }

        getProfile()
    }, []);

    return(
        <div className='page-container'>
            <h1>Profile Page</h1>
            <p>Welcome to strata reserve planning profile page!</p>

            <div className='response-area'>
                <h3>Response:</h3>
                <pre>{data}</pre>
            </div>
        </div>
    )
}