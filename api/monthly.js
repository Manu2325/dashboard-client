export default async function handler(req, res) {
  const { gid = '0' } = req.query;
  const sheetId = '1HHRfE4ORSBftC9WLwwpnAPwEol71BvLawoySzMoMVLE';

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl, { redirect: 'follow' });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Google Sheets returned HTTP ${response.status}. Verify sharing permissions.` 
      });
    }

    const csvData = await response.text();

    // Si Google redirige a una pantalla HTML de login en lugar del CSV
    if (csvData.includes('<!DOCTYPE html>') || csvData.includes('accounts.google.com')) {
      return res.status(403).json({
        error: 'The Google Sheet is not publicly shared. Change permissions to "Anyone with the link can view".'
      });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(csvData);

  } catch (error) {
    console.error('Error fetching monthly sheet:', error);
    return res.status(500).json({ error: 'Failed to retrieve monthly CSV', details: error.message });
  }
}