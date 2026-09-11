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
});
