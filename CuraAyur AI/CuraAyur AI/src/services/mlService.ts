export class MLService {
  private readonly ML_SERVER_URL = 'http://localhost:8000';

  async predictDiabetes(data: any): Promise<any> {
    const res = await fetch(`${this.ML_SERVER_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      throw new Error(`ML Service Error: ${res.statusText}`);
    }
    
    return res.json();
  }

  async predictCardio(data: any): Promise<any> {
    const res = await fetch(`${this.ML_SERVER_URL}/predict/cardio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      throw new Error(`ML Service Error: ${res.statusText}`);
    }
    
    return res.json();
  }

  async predictBreastCancer(data: any): Promise<any> {
    const res = await fetch(`${this.ML_SERVER_URL}/predict/breast-cancer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      throw new Error(`ML Service Error: ${res.statusText}`);
    }
    
    return res.json();
  }
}
