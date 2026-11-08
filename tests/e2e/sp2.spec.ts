import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const password = 'Orbit-study-2026!';
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name });
async function signUp(page: Page, name: string, email: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.getByRole('textbox', { name: 'Họ và tên' }).fill(name);
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page.getByRole('button', { name: /Tạo không gian đầu tiên/ })).toBeVisible();
}

test('SP2: create a project, add and assign tasks, follow them from the overview', async ({ page, browser }) => {
  const id = Date.now().toString(36);
  const memberEmail = `sp2-member-${id}@example.test`;
  await signUp(page, 'Phạm Minh Hùng', `sp2-owner-${id}@example.test`);
  await page.screenshot({ path: 'work/orbit-welcome.png' });
  await page.getByRole('button', { name: /Tạo không gian đầu tiên/ }).click();
  await page.getByRole('textbox', { name: 'Tên không gian', exact: true }).fill(`Đồ án ${id}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Tạo không gian', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bắt đầu với nhóm của bạn' })).toBeVisible();
  await page.screenshot({ path: 'work/orbit-setup.png' });

  await page.getByRole('main').getByRole('button', { name: 'Tạo dự án' }).click();
  await page.getByRole('textbox', { name: 'Tên dự án' }).fill('Website bán hàng');
  await page.getByRole('textbox', { name: 'Mô tả' }).fill('Ra mắt trang bán hàng');
  await page.getByLabel('Ngày kết thúc').fill('2026-12-22');
  await page.getByRole('dialog').getByRole('button', { name: 'Tạo dự án' }).click();
  await expect(page.getByRole('heading', { name: 'Website bán hàng', level: 1 })).toBeVisible();
  await expect(page.getByText('Phụ trách: Phạm Minh Hùng')).toBeVisible();

  const title = page.getByRole('textbox', { name: 'Tên nhiệm vụ mới' });
  await title.fill('Thiết kế trang chủ');
  await page.getByLabel('Hạn của nhiệm vụ mới').fill('2026-01-15');
  await page.getByRole('combobox', { name: 'Người thực hiện của nhiệm vụ mới' }).selectOption({ label: 'Phạm Minh Hùng' });
  await title.press('Enter');
  await expect(page.getByRole('button', { name: /Thiết kế trang chủ/ })).toBeVisible();
  await expect(title).toHaveValue('');
  await expect(title).toBeFocused();
  await title.fill('Viết nội dung');
  await title.press('Enter');
  await expect(page.getByRole('button', { name: /Viết nội dung/ })).toBeVisible();
  await page.screenshot({ path: 'work/orbit-project.png', fullPage: true });

  const projectUrl = page.url();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Website bán hàng', level: 1 })).toBeVisible();
  expect(page.url()).toBe(projectUrl);

  await nav(page, 'Tổng quan').click();
  const overdue = page.locator('.due-overdue');
  await expect(overdue).toContainText('Thiết kế trang chủ');
  await page.screenshot({ path: 'work/orbit-home.png', fullPage: true });
  await overdue.getByRole('button', { name: /Thiết kế trang chủ/ }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('textbox', { name: 'Mô tả' }).fill('Theo bản phác thảo của nhóm');
  await drawer.getByLabel('Hạn hoàn thành').fill('2027-03-01');
  await page.screenshot({ path: 'work/orbit-task.png' });
  await drawer.getByRole('button', { name: 'Lưu nhiệm vụ' }).click();
  await expect(page.getByText('Đã lưu nhiệm vụ.')).toBeVisible();
  await expect(page.locator('.due-overdue')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Website bán hàng', level: 1 })).toBeVisible();

  await nav(page, 'Thành viên').click();
  await page.getByRole('button', { name: 'Mời thành viên' }).click();
  await page.getByRole('textbox', { name: 'Email thành viên' }).fill(memberEmail);
  await page.getByRole('combobox', { name: 'Vai trò', exact: true }).selectOption('VIEWER');
  await page.getByRole('button', { name: 'Tạo lời mời' }).click();
  const inviteToken = await page.getByRole('textbox', { name: 'Mã mời vừa tạo' }).inputValue();
  await page.getByRole('button', { name: 'Xong' }).click();

  const context = await browser.newContext();
  const viewer = await context.newPage();
  await signUp(viewer, 'Nguyễn Người Xem', memberEmail);
  await viewer.getByRole('button', { name: /Nhập mã mời/ }).click();
  await viewer.getByRole('textbox', { name: 'Mã mời', exact: true }).fill(inviteToken);
  await viewer.getByRole('dialog').getByRole('button', { name: 'Tham gia', exact: true }).click();
  await nav(viewer, 'Dự án').click();
  await expect(viewer.getByRole('button', { name: 'Tạo dự án' })).toHaveCount(0);
  await viewer.getByRole('link', { name: /Website bán hàng/ }).click();
  await expect(viewer.getByRole('textbox', { name: 'Tên nhiệm vụ mới' })).toHaveCount(0);
  await expect(viewer.getByRole('button', { name: 'Sửa dự án' })).toHaveCount(0);
  await viewer.getByRole('button', { name: /Viết nội dung/ }).click();
  await expect(viewer.getByRole('dialog').getByRole('textbox', { name: 'Tên nhiệm vụ' })).toBeDisabled();
  await expect(viewer.getByRole('button', { name: 'Xóa nhiệm vụ' })).toHaveCount(0);
  await context.close();

  await nav(page, 'Dự án').click();
  await page.getByRole('link', { name: /Website bán hàng/ }).click();
  await page.getByRole('combobox', { name: 'Người thực hiện của Viết nội dung' }).selectOption({ label: 'Nguyễn Người Xem' });
  await expect(page.getByRole('combobox', { name: 'Người thực hiện của Viết nội dung' })).toHaveValue(/.+/);
  await page.getByRole('button', { name: /Viết nội dung/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa nhiệm vụ' }).click();
  await page.getByRole('dialog', { name: 'Xóa nhiệm vụ?' }).getByRole('button', { name: 'Xóa nhiệm vụ' }).click();
  await expect(page.getByRole('button', { name: /Viết nội dung/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Sửa dự án' }).click();
  await page.getByRole('combobox', { name: 'Trạng thái' }).selectOption('COMPLETED');
  await page.getByRole('dialog').getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('textbox', { name: 'Tên nhiệm vụ mới' })).toHaveCount(0);
  await expect(page.getByText('Dự án đã đóng')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav(page, 'Dự án')).toBeVisible();
  await page.screenshot({ path: 'work/orbit-project-mobile.png', fullPage: true });
  for (const width of [320, 390, 820]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
});
