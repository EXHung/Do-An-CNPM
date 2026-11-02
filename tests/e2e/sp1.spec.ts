import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const password = 'Orbit-study-2026!';
async function register(page: Page, name: string, email: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.getByRole('textbox', { name: 'Họ và tên' }).fill(name);
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Không gian của nhóm' })).toBeVisible();
}

test('SP1 browser workflow with real API and PostgreSQL', async ({ page, browser }) => {
  const id = Date.now().toString(36);
  const email = `owner-${id}@example.test`;
  const viewerEmail = `viewer-${id}@example.test`;
  await register(page, 'Nhóm trưởng SP1', email);
  await page.getByRole('button', { name: 'Tạo không gian đầu tiên' }).click();
  await page.getByRole('textbox', { name: 'Tên không gian', exact: true }).fill('Nhóm Công nghệ phần mềm');
  await page.getByRole('textbox', { name: 'Đường dẫn ngắn' }).fill(`nhom-${id}`);
  await page.getByRole('button', { name: 'Tạo không gian', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Thông tin không gian' })).toBeVisible();
  await expect(page.getByText(email, { exact: true }).last()).toBeVisible();
  await page.getByRole('textbox', { name: 'Mô tả' }).fill('SP1 của nhóm ba thành viên');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã cập nhật thông tin không gian.')).toBeVisible();

  await page.getByRole('textbox', { name: 'Email thành viên' }).fill(viewerEmail);
  await page.getByRole('combobox', { name: 'Vai trò', exact: true }).selectOption('VIEWER');
  await page.getByRole('button', { name: 'Tạo lời mời' }).click();
  const tokenInput = page.getByRole('textbox', { name: 'Mã mời vừa tạo' });
  await expect(tokenInput).not.toHaveValue('');
  const inviteToken = await tokenInput.inputValue();

  const viewerContext = await browser.newContext();
  const viewer = await viewerContext.newPage();
  await register(viewer, 'Người xem SP1', viewerEmail);
  await viewer.getByRole('textbox', { name: 'Mã mời', exact: true }).fill(inviteToken);
  await viewer.getByRole('button', { name: 'Tham gia', exact: true }).click();
  await expect(viewer.locator('.member-table')).toBeVisible();
  await expect(viewer.getByRole('textbox', { name: 'Tên không gian', exact: true })).toBeDisabled();
  await expect(viewer.getByRole('button', { name: 'Lưu thay đổi' })).toHaveCount(0);
  await expect(viewer.getByRole('button', { name: 'Tạo lời mời' })).toHaveCount(0);
  await expect(viewer.getByRole('heading', { name: 'Nhật ký hoạt động' })).toHaveCount(0);
  await viewer.reload();
  await expect(viewer.locator('.member-table')).toBeVisible();
  await page.reload();
  const roleSelect = page.getByRole('combobox', { name: `Vai trò của ${viewerEmail}` });
  await roleSelect.selectOption('MEMBER');
  await expect(page.getByText('Đã cập nhật vai trò.')).toBeVisible();
  await viewer.reload();
  await expect(viewer.locator('.permission-panel').getByRole('heading', { name: 'Thành viên', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Giao diện tối' }).click();
  await page.screenshot({ path: 'work/sp1-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Không gian của nhóm' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'work/sp1-mobile.png', fullPage: true });
  await viewer.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(viewer.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await viewer.reload();
  await expect(viewer.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await viewerContext.close();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Thông tin không gian' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mô tả' })).toHaveValue('SP1 của nhóm ba thành viên');
});

test('login form exposes validation and server errors without fake sign-in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('nobody@example.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).last().click();
  await expect(page.locator('.sp1-notice[role="alert"]')).toContainText('Email hoặc mật khẩu không đúng');
  await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await page.screenshot({ path: 'work/sp1-login.png', fullPage: true });
});

test('interface keeps users oriented: joining, stale edits, confirmation, theme and expired session', async ({ page, browser }) => {
  const id = Date.now().toString(36);
  const ownerEmail = `ux-owner-${id}@example.test`;
  const guestEmail = `ux-guest-${id}@example.test`;
  await register(page, 'Trưởng nhóm UX', ownerEmail);
  await page.getByRole('button', { name: 'Tạo không gian đầu tiên' }).click();
  await page.getByRole('textbox', { name: 'Tên không gian', exact: true }).fill(`Đội Đổi mới ${id}`);
  await expect(page.getByRole('textbox', { name: 'Đường dẫn ngắn' })).toHaveValue(`doi-doi-moi-${id}`);
  await page.getByRole('button', { name: 'Tạo không gian', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Thông tin không gian' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Email thành viên' }).fill(guestEmail);
  await page.getByRole('button', { name: 'Tạo lời mời' }).click();
  const inviteToken = await page.getByRole('textbox', { name: 'Mã mời vừa tạo' }).inputValue();

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await register(guest, 'Khách UX', guestEmail);
  await guest.getByRole('button', { name: 'Tạo không gian đầu tiên' }).click();
  await guest.getByRole('textbox', { name: 'Tên không gian', exact: true }).fill(`Riêng của khách ${id}`);
  await guest.getByRole('button', { name: 'Tạo không gian', exact: true }).last().click();
  await expect(guest.getByRole('heading', { name: 'Thông tin không gian' })).toBeVisible();
  await guest.getByRole('textbox', { name: 'Mã mời', exact: true }).fill('ma-sai');
  await guest.getByRole('button', { name: 'Tham gia', exact: true }).click();
  await expect(guest.locator('#token-error')).toBeVisible();
  await guest.getByRole('textbox', { name: 'Mã mời', exact: true }).fill(inviteToken);
  await guest.getByRole('button', { name: 'Tham gia', exact: true }).click();
  await expect(guest.locator('.crumbs')).toContainText(`Đội Đổi mới ${id}`);

  const secondTab = await page.context().newPage();
  await secondTab.goto('/');
  await secondTab.getByRole('textbox', { name: 'Mô tả' }).fill('Bản lưu từ tab thứ hai');
  await secondTab.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(secondTab.getByText('Đã cập nhật thông tin không gian.')).toBeVisible();
  await secondTab.close();
  await page.getByRole('textbox', { name: 'Mô tả' }).fill('Bản cũ không được ghi đè');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.locator('.sp1-notice[role="alert"]')).toContainText('Không gian đã thay đổi');
  await expect(page.getByRole('textbox', { name: 'Mô tả' })).toHaveValue('Bản lưu từ tab thứ hai');

  await page.reload();
  const activity = page.locator('.audit-panel');
  await expect(activity).toContainText(`đã mời ${guestEmail} làm Thành viên`);
  await expect(activity).toContainText('Khách UX đã tham gia với vai trò Thành viên');
  await page.getByRole('button', { name: 'Xóa thành viên' }).click();
  const dialog = page.getByRole('dialog', { name: 'Xóa thành viên?' });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: 'work/sp1-dialog.png' });
  await dialog.getByRole('button', { name: 'Hủy' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(guestEmail, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa thành viên' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa thành viên' }).click();
  await expect(page.getByText('Đã xóa thành viên khỏi không gian.')).toBeVisible();
  await expect(activity).toContainText('Người đã rời nhóm');

  await page.getByRole('button', { name: 'Giao diện tối' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Giao diện sáng' })).toBeVisible();

  await guestContext.clearCookies();
  await guest.getByRole('textbox', { name: 'Mã mời', exact: true }).fill('a'.repeat(64));
  await guest.getByRole('button', { name: 'Tham gia', exact: true }).click();
  await expect(guest.locator('.sp1-notice[role="alert"]')).toContainText('Phiên đăng nhập đã hết hạn');
  await expect(guest.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await guestContext.close();
});
