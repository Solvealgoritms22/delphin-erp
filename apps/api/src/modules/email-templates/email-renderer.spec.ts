import { BadRequestException } from '@nestjs/common';
import { renderEmail } from './email-renderer';

describe('email renderer', () => {
  it('escapes every recipient-controlled value in the HTML document', () => {
    const email = renderEmail('quote', {
      company:'<img src=x onerror=alert(1)>', name:'<script>x</script>',
      documentNumber:'COT-1', total:'10.00', currency:'DOP',
    }, undefined, {rows:[{label:'<b>Item</b>',value:'<i>10</i>'}]});
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(email.html).not.toContain('<b>Item</b>');
  });
  it('does not allow a custom design to introduce unsafe variables', () => {
    expect(() => renderEmail('quote', {
      company:'Empresa',name:'Ana',documentNumber:'COT-1',total:'10',currency:'DOP',
    }, {subject:'{{password}}',heading:'x',body:'x',footer:'x',accent:'#2563eb'})).toThrow(BadRequestException);
  });
  it('keeps the activation destination server controlled and HTTPS', () => {
    expect(() => renderEmail('invitation',{company:'Empresa',name:'Ana'},undefined,{
      actionUrl:'javascript:alert(1)',
    })).toThrow(BadRequestException);
    const email = renderEmail('invitation',{company:'Empresa',name:'Ana'},undefined,{
      actionUrl:'https://erp.example/auth/accept-invitation?token=opaque',
    });
    expect(email.html).toContain('https://erp.example/auth/accept-invitation?token=opaque');
    expect(email.text).toContain('https://erp.example/auth/accept-invitation?token=opaque');
  });
  it('requires six-digit OTP codes and adds security guidance', () => {
    expect(() => renderEmail('verification',{name:'Ana'},undefined,{code:'abc'})).toThrow(BadRequestException);
    const email = renderEmail('verification',{name:'Ana'},undefined,{code:'123456'});
    expect(email.html).toContain('123456');
    expect(email.text).toContain('No lo compartas con nadie.');
  });
  it('renders rich HTML body with images while keeping variables safely escaped', () => {
    const custom = {
      subject: 'Cotización {{documentNumber}} · {{company}}',
      heading: 'Propuesta comercial',
      body: '<p>Estimado <strong>{{name}}</strong>:</p><p><img src="https://cdn.example.com/logo.png" alt="Logo"></p><p>Adjuntamos el detalle de su cotización.</p>',
      footer: 'Atentamente {{company}}',
      accent: '#2563eb'
    };
    const email = renderEmail('quote', {
      company: 'ACME Corp',
      name: '<script>alert(1)</script>',
      documentNumber: 'COT-99',
      total: '1500.00',
      currency: 'DOP'
    }, custom);

    // Debe contener el HTML estructurado y la imagen con estilos responsivos
    expect(email.html).toContain('<img src="https://cdn.example.com/logo.png" alt="Logo" style="max-width:100%;height:auto" />');
    expect(email.html).toContain('<strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>');
    expect(email.html).not.toContain('<script>');
  });
  it('only includes dolphin logo in system templates, not in tenant templates', () => {
    // 1. Plantilla de empresa sin logo: muestra el nombre de la empresa, sin logo de Dolphin ERP
    const quoteEmail = renderEmail('quote', {
      company: 'Farmacia Rosales SRL',
      name: 'Juan Perez',
      documentNumber: 'COT-001',
      total: '2,500.00',
      currency: 'DOP',
    });
    expect(quoteEmail.html).not.toContain('cid:dolphin-brand');
    expect(quoteEmail.html).toContain('Farmacia Rosales SRL');
    expect(quoteEmail.attachments.some((a) => a.cid === 'dolphin-brand')).toBe(false);

    // 2. Plantilla de empresa con logo: muestra la imagen del logo de la empresa
    const quoteWithLogo = renderEmail('quote', {
      company: 'Farmacia Rosales SRL',
      companyLogo: 'https://cdn.example.com/farmacia-logo.png',
      name: 'Juan Perez',
      documentNumber: 'COT-001',
      total: '2,500.00',
      currency: 'DOP',
    });
    expect(quoteWithLogo.html).not.toContain('cid:dolphin-brand');
    expect(quoteWithLogo.html).toContain('https://cdn.example.com/farmacia-logo.png');

    // 3. Plantilla del sistema (verification): sí incluye el logo de Dolphin ERP
    const verificationEmail = renderEmail('verification', { name: 'Admin' }, undefined, { code: '654321' });
    expect(verificationEmail.html).toContain('cid:dolphin-brand');
    expect(verificationEmail.html).toContain('Dolphin ERP');
    expect(verificationEmail.attachments.some((a) => a.cid === 'dolphin-brand')).toBe(true);
  });
});
