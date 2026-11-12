$ErrorActionPreference = 'Stop'

$mutex = New-Object System.Threading.Mutex($false, 'Local\VillageJusticeRedDisplayBorder')
if (-not $mutex.WaitOne(0)) {
    $mutex.Dispose()
    exit
}

$source = @'
using System;
using System.Drawing;
using System.Windows.Forms;

public sealed class VillageRedBorderWindow : Form
{
    private const int WS_EX_TRANSPARENT = 0x00000020;
    private const int WS_EX_TOOLWINDOW = 0x00000080;
    private const int WS_EX_NOACTIVATE = 0x08000000;
    private readonly Color borderColor = Color.FromArgb(235, 225, 42, 55);

    public VillageRedBorderWindow()
    {
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        BackColor = Color.Magenta;
        TransparencyKey = Color.Magenta;
        Bounds = SystemInformation.VirtualScreen;
        TopMost = true;
        DoubleBuffered = true;
    }

    protected override bool ShowWithoutActivation { get { return true; } }

    protected override CreateParams CreateParams
    {
        get
        {
            CreateParams parameters = base.CreateParams;
            parameters.ExStyle |= WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
            return parameters;
        }
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
        Rectangle virtualScreen = SystemInformation.VirtualScreen;
        using (Pen pen = new Pen(borderColor, 5f))
        {
            pen.Alignment = System.Drawing.Drawing2D.PenAlignment.Inset;
            foreach (Screen screen in Screen.AllScreens)
            {
                Rectangle frame = screen.Bounds;
                frame.Offset(-virtualScreen.Left, -virtualScreen.Top);
                frame.Inflate(-12, -12);
                if (frame.Width > 0 && frame.Height > 0)
                    e.Graphics.DrawRectangle(pen, frame);
            }
        }
    }
}

public sealed class VillageRedBorderContext : ApplicationContext
{
    private readonly VillageRedBorderWindow border;
    private readonly NotifyIcon tray;
    private readonly ToolStripMenuItem toggle;

    public VillageRedBorderContext()
    {
        border = new VillageRedBorderWindow();
        toggle = new ToolStripMenuItem("Hide red border");
        toggle.Click += (sender, args) =>
        {
            if (border.Visible)
            {
                border.Hide();
                toggle.Text = "Show red border";
            }
            else
            {
                border.Bounds = SystemInformation.VirtualScreen;
                border.Show();
                border.TopMost = true;
                border.Invalidate();
                toggle.Text = "Hide red border";
            }
        };

        ContextMenuStrip menu = new ContextMenuStrip();
        menu.Items.Add(toggle);
        menu.Items.Add(new ToolStripSeparator());
        ToolStripMenuItem exit = new ToolStripMenuItem("Exit red border");
        exit.Click += (sender, args) => ExitThread();
        menu.Items.Add(exit);

        tray = new NotifyIcon
        {
            Icon = SystemIcons.Information,
            Text = "Village red display border",
            ContextMenuStrip = menu,
            Visible = true
        };
        border.Show();
    }

    protected override void ExitThreadCore()
    {
        tray.Visible = false;
        tray.Dispose();
        border.Close();
        border.Dispose();
        base.ExitThreadCore();
    }
}
'@

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    Add-Type -TypeDefinition $source -ReferencedAssemblies 'System.Windows.Forms.dll', 'System.Drawing.dll'
    [System.Windows.Forms.Application]::EnableVisualStyles()
    [System.Windows.Forms.Application]::Run([VillageRedBorderContext]::new())
} catch {
    $_ | Out-File -LiteralPath (Join-Path $env:TEMP 'VillageRedBorder-error.log') -Encoding utf8
    throw
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
