using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
namespace Jellyfin.Plugin.EnhancedGuide;
public sealed class Registration : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection services, IServerApplicationHost host)
        => services.AddHostedService<GuideRegistration>();
}
public sealed class GuideRegistration(ILogger<GuideRegistration> logger) : BackgroundService
{
    private const string ScriptId = "aeea3bf9-b271-43a0-880e-ef18c9789723-guide";
    private Type? injector;
    protected override async Task ExecuteAsync(CancellationToken token)
    {
        using var stream = typeof(Plugin).Assembly.GetManifestResourceStream("EnhancedGuide.Script")!;
        using var reader = new StreamReader(stream);
        var script = await reader.ReadToEndAsync(token);
        for (var attempt=0; attempt<30 && !token.IsCancellationRequested; attempt++)
        {
            try
            {
                injector = AssemblyLoadContext.All.SelectMany(x=>x.Assemblies)
                    .Select(x=>x.GetType("Jellyfin.Plugin.JavaScriptInjector.PluginInterface"))
                    .FirstOrDefault(x=>x!=null);
                var method = injector?.GetMethod("RegisterScript", BindingFlags.Public | BindingFlags.Static);
                if (method != null)
                {
                    var payload = JsonSerializer.Serialize(new { id=ScriptId, name="Enhanced Guide", script, enabled=true, requiresAuthentication=true, pluginId="aeea3bf9-b271-43a0-880e-ef18c9789723", pluginName="Enhanced Guide", pluginVersion="1.0.0.0" });
                    var type = method.GetParameters()[0].ParameterType;
                    var obj = type.GetMethod("Parse", new[]{typeof(string)})!.Invoke(null,new object[]{payload});
                    if (method.Invoke(null,new[]{obj}) is true) { logger.LogInformation("Enhanced Guide registered"); return; }
                }
            }
            catch(Exception ex) { logger.LogDebug(ex,"Enhanced Guide registration retry"); }
            await Task.Delay(TimeSpan.FromSeconds(5),token);
        }
        logger.LogWarning("Enhanced Guide could not register. Install a compatible JavaScript Injector and restart.");
    }
}